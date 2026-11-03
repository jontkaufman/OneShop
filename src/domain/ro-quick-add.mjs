/**
 * Portable OneShop quick-add rules. No persistence, permissions or auto numbering
 * are granted by these functions. Server must validate again in one transaction.
 */
export const EXACT_UNIT_LOOKUP_FIELDS = Object.freeze(['vin','stock_number','unit_id']);
const norm = x => typeof x === 'string' ? x.trim() : '';
const key = x => norm(x).toLocaleLowerCase('en-US');
export function matchUnitsByExactIdentifier(units, field, value) {
  if (!EXACT_UNIT_LOOKUP_FIELDS.includes(field))
    throw new Error('Use VIN, stock number or stable Unit ID; make/model is not unique');
  if (!Array.isArray(units)) throw new Error('Units must be a list');
  if (!key(value)) throw new Error('Enter a unit identifier');
  const matched = [];
  for (const u of units) {
    if (!u || typeof u !== 'object') continue;
    const original = field==='stock_number' ? u.stock_number ?? u.stock
      : field==='unit_id' ? u.id ?? u.unit_id : u.vin;
    if (key(original) === key(value)) matched.push(u);
  }
  return matched; // Deliberately do not choose a winner when more than one matches.
}

export function normalizeRODraft({unitId, number = null, description, lineItems = []} = {}) {
  if (!norm(unitId)) throw new Error('Select an existing Unit ID');
  if (number !== null && (!norm(number) || norm(number).length > 60))
    throw new Error('Manual RO number must be 1–60 characters');
  const workDescription = norm(description);
  if (!workDescription || workDescription.length > 2000)
    throw new Error('Brief RO work description is required (max 2000 characters)');
  if (!Array.isArray(lineItems)) throw new Error('Line items must be a list');
  if (lineItems.length > 100) throw new Error('Too many line items');
  const lines = lineItems.map(v=>norm(v)).filter(Boolean);
  if(lines.some(v=>v.length>300)) throw new Error('Line item exceeds 300 characters');
  return {
    unitId: norm(unitId),
    proposedRoNumber: number === null ? null : norm(number),
    workDescription,
    lines,
    status: 'draft',
  };
}
