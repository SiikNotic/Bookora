// Comprobación mínima de la validación de tarjeta (npm test). Sin dependencias.
import assert from 'node:assert/strict';
import { validCardNumber } from '../src/lib/format.js';

for (const ok of ['4242424242424242', '4111111111111111', '378282246310005', '6011111111111117', '4222222222222']) {
  assert.equal(validCardNumber(ok), true, ok);
}
for (const bad of ['1234567890123456', '4242424242424241', '424242424242', '42424242424242424242', '', 'abcd']) {
  assert.equal(validCardNumber(bad), false, bad);
}
console.log('validCardNumber: ok');
