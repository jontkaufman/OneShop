/**
 * OneShop handoff policy model (pure, testable domain logic).
 * Returns intents for a transactional service, NOT committed DB writes or push delivery.
 * Tenant, branch, capability, capacity and movement-version checks MUST happen server-side.
 */
const valid = (v) => typeof v === 'string' && v.trim().length > 0;
const assertText = (v, label) => { if (!valid(v)) throw new Error(`Missing ${label}`); };
const identity = (kind, id) => ({ kind, id });
const notification = (eventId, recipient, code, actionable, taskId = null) => ({
  notificationKey: `${eventId}:${recipient.kind}:${recipient.id}:${code}`,
  recipient,
  code,
  actionable,
  taskId,
});
const workTask = (eventId, code, owner, source) => ({
  taskKey: `${eventId}:${code}`,
  code,
  owner,
  source,
  status: 'queued',
});

/** Locate next accountable receiving owner. User assignment is only inferred for
 * an explicitly assigned Service Bay technician. All other routes require a
 * configured role or a visible dispatcher fallback. The DB must validate scope.
 */
export function resolveReceivingOwner({ destinationKind, assignedTechnicianId, receivingRoleId, fallbackRoleId = 'foreman' }) {
  assertText(destinationKind, 'destinationKind');
  if (destinationKind === 'service_bay' && valid(assignedTechnicianId)) {
    return identity('user', assignedTechnicianId);
  }
  if (valid(receivingRoleId)) return identity('role', receivingRoleId);
  if (destinationKind === 'service_bay') return identity('role', 'foreman');
  assertText(fallbackRoleId, 'fallbackRoleId');
  return identity('role', fallbackRoleId);
}

const deduplicate = (array, key) => [...new Map(array.map(item => [item[key], item])).values()];

/**
 * @param {object} event A validated domain event (move.requested / move.claimed / move.delivered).
 * @returns {{tasks: object[], notifications: object[]}} Unique DB write intents.
 */
export function planHandoff(event) {
  if (!event || typeof event !== 'object') throw new Error('Event must be an object');
  const { eventId, type, branchId, unitId, moveId, requesterId } = event;
  for (const [name, value] of Object.entries({ eventId, type, branchId, unitId, moveId, requesterId })) assertText(value, name);
  const source = { branchId, unitId, moveId };
  const tasks = [];
  const notifications = [];
  if (type === 'move.requested') {
    assertText(event.pickupLocationId, 'pickupLocationId');
    assertText(event.destinationTypeId, 'destinationTypeId');
    const porterQueue = identity('role', 'porter');
    const task = workTask(eventId, 'perform_move', porterQueue, source);
    tasks.push(task);
    notifications.push(notification(eventId, porterQueue, 'move_ready_to_claim', true, task.taskKey));
  } else if (type === 'move.claimed') {
    assertText(event.porterId, 'porterId');
    // The claim transaction already assigns the existing move task to this porter.
    // An informational confirmation goes to the requester; no duplicate new task.
    if (event.porterId !== requesterId) {
      notifications.push(notification(eventId, identity('user', requesterId), 'move_claimed', false));
    }
  } else if (type === 'move.delivered') {
    assertText(event.destinationLocationId, 'destinationLocationId');
    assertText(event.destinationKind, 'destinationKind');
    const receiver = resolveReceivingOwner(event);
    const receivingTask = workTask(eventId, 'receive_unit', receiver, source);
    tasks.push(receivingTask);
    const requester = identity('user', requesterId);
    if (receiver.kind === 'user' && receiver.id === requesterId) {
      // The same person's work is actionable, with delivery context in one card.
      notifications.push(notification(eventId, receiver, 'unit_delivered_receive_unit', true, receivingTask.taskKey));
    } else {
      notifications.push(notification(eventId, requester, 'unit_delivered', false));
      notifications.push(notification(eventId, receiver, 'unit_ready_for_receiver', true, receivingTask.taskKey));
    }
  } else {
    throw new Error(`Unsupported handoff event type: ${type}`);
  }
  return { tasks: deduplicate(tasks, 'taskKey'), notifications: deduplicate(notifications, 'notificationKey') };
}

/** Notifications alone do not grant assignment, acknowledgement or completion. */
export function canAcceptTask({ actorId, owner, allowedRoleIds = [] }) {
  if (!valid(actorId) || !owner) return false;
  if (owner.kind === 'user') return owner.id === actorId;
  return owner.kind === 'role' && Array.isArray(allowedRoleIds) && allowedRoleIds.includes(owner.id);
}
