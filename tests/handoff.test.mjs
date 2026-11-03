import test from 'node:test';
import assert from 'node:assert/strict';
import { planHandoff, resolveReceivingOwner, canAcceptTask } from '../src/domain/handoff.mjs';
const base = { eventId:'event-1', branchId:'branch-1', unitId:'unit-42', moveId:'move-33', requesterId:'writer-1' };

test('move request creates one shared porter task and one actionable role notification', () => {
  const r = planHandoff({ ...base, type:'move.requested', pickupLocationId:'dropoff', destinationTypeId:'service-storage' });
  assert.equal(r.tasks.length, 1);
  assert.deepEqual(r.tasks[0].owner, { kind:'role', id:'porter' });
  assert.equal(r.notifications.length, 1);
  assert.equal(r.notifications[0].recipient.id, 'porter');
  assert.equal(r.notifications[0].actionable, true);
});

test('request can omit exact numbered destination and still dispatch', () => {
  const r = planHandoff({ ...base, type:'move.requested', pickupLocationId:'dropoff', destinationTypeId:'wash-bay' });
  assert.equal(r.tasks[0].code, 'perform_move');
});

test('porter claim informs requester but does not duplicate a move task', () => {
  const r = planHandoff({ ...base, type:'move.claimed', porterId:'porter-2' });
  assert.equal(r.tasks.length, 0);
  assert.equal(r.notifications.length, 1);
  assert.deepEqual(r.notifications[0].recipient, { kind:'user', id:'writer-1' });
});

test('delivery to assigned technician generates requester completion and technician task', () => {
  const r = planHandoff({ ...base, type:'move.delivered', destinationLocationId:'SB-01', destinationKind:'service_bay', assignedTechnicianId:'tech-4' });
  assert.equal(r.tasks.length, 1);
  assert.deepEqual(r.tasks[0].owner, { kind:'user', id:'tech-4' });
  assert.equal(r.notifications.length, 2);
  assert.equal(r.notifications.find(n => n.recipient.id === 'writer-1').actionable, false);
  assert.equal(r.notifications.find(n => n.recipient.id === 'tech-4').actionable, true);
});

test('service bay without a technician routes to foreman instead', () => {
  const r = planHandoff({ ...base, type:'move.delivered', destinationLocationId:'SB-01', destinationKind:'service_bay' });
  assert.deepEqual(r.tasks[0].owner, { kind:'role', id:'foreman' });
});

test('configured storage receiving role receives workload rather than an arbitrary technician', () => {
  const r = planHandoff({ ...base, type:'move.delivered', destinationLocationId:'SS-04', destinationKind:'storage', receivingRoleId:'service_dispatch' });
  assert.deepEqual(r.tasks[0].owner, { kind:'role', id:'service_dispatch' });
});

test('same requester and receiving technician gets one actionable combined notification', () => {
  const r = planHandoff({ ...base, type:'move.delivered', destinationLocationId:'SB-01', destinationKind:'service_bay', assignedTechnicianId:'writer-1' });
  assert.equal(r.notifications.length, 1);
  assert.equal(r.notifications[0].actionable, true);
  assert.equal(r.notifications[0].code, 'unit_delivered_receive_unit');
});

test('retries produce the same deterministic notification and task keys', () => {
  const e = { ...base, type:'move.delivered', destinationLocationId:'SS-04', destinationKind:'storage', receivingRoleId:'service_dispatch' };
  assert.deepEqual(planHandoff(e), planHandoff(e));
});

test('invalid movement is not silently assigned', () => {
  assert.throws(() => planHandoff({ ...base, type:'move.requested', pickupLocationId:'dropoff' }), /destinationTypeId/);
  assert.throws(() => planHandoff({ ...base, type:'move.delivered', destinationKind:'service_bay' }), /destinationLocationId/);
  assert.throws(() => planHandoff({ ...base, type:'move.unknown' }), /Unsupported/);
});

test('task acceptance is restricted to intended user or permitted role', () => {
  assert.equal(canAcceptTask({actorId:'tech-4',owner:{kind:'user',id:'tech-4'}}), true);
  assert.equal(canAcceptTask({actorId:'tech-5',owner:{kind:'user',id:'tech-4'}}), false);
  assert.equal(canAcceptTask({actorId:'porter-1',owner:{kind:'role',id:'porter'},allowedRoleIds:['porter']}), true);
  assert.equal(canAcceptTask({actorId:'writer-1',owner:{kind:'role',id:'porter'},allowedRoleIds:['service_writer']}), false);
});

test('explicit routing policy beats default dispatcher for non-bay destinations', () => {
  assert.deepEqual(resolveReceivingOwner({destinationKind:'pdi_staging',receivingRoleId:'pdi'}), {kind:'role',id:'pdi'});
});
