const assert = require('node:assert/strict');
const { normalizeHealthPayload } = require('../src/watch.js');

const n1 = normalizeHealthPayload({ bpm: 120, calories: 250, vo2: 42.1, zone: 'cardio' });
assert.equal(n1.heartRate, 120);
assert.equal(n1.calories, 250);
assert.equal(n1.vo2, 42.1);
assert.equal(n1.zone, 'cardio');

const n2 = normalizeHealthPayload({ heart_rate: '98', kcal: '100.5' });
assert.equal(n2.heartRate, 98);
assert.equal(n2.calories, 100.5);

console.log('watch tests: OK');
