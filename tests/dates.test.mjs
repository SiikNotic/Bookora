// Comprobación mínima de las fechas en hora de Puerto Rico (npm test). Sin dependencias.
import assert from 'node:assert/strict';
import { toDateTime, toPR, toTimestamp } from '../src/lib/dates.js';

// 14:30 en PR (UTC-4) es 18:30 UTC, sin importar la zona del equipo
assert.equal(toTimestamp('2026-10-20', '14:30'), '2026-10-20T14:30:00-04:00');
assert.equal(toDateTime('2026-10-20', '14:30').toISOString(), '2026-10-20T18:30:00.000Z');
assert.deepEqual(toPR('2026-10-20T18:30:00Z'), { date: '2026-10-20', time: '14:30' });
// Cerca de medianoche UTC sigue siendo el día anterior en PR
assert.deepEqual(toPR('2026-10-21T02:15:00Z'), { date: '2026-10-20', time: '22:15' });
// Ida y vuelta
assert.deepEqual(toPR(toTimestamp('2026-12-31', '23:30')), { date: '2026-12-31', time: '23:30' });
console.log('fechas PR: ok');
