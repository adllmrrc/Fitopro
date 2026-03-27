const assert = require('node:assert/strict');
const { initSession, startWorkout, validateStep } = require('../src/flow.js');

const workout = { sets: 3 };
let s = initSession();
s = startWorkout(s);
assert.equal(s.phase, 'exercice');
assert.equal(s.setIndex, 1);

s = validateStep(s, workout);
assert.equal(s.phase, 'repos');
assert.equal(s.completedSets, 1);

s = validateStep(s, workout);
assert.equal(s.phase, 'exercice');
assert.equal(s.setIndex, 2);

s = validateStep(s, workout);
s = validateStep(s, workout);
s = validateStep(s, workout);
assert.equal(s.phase, 'terminé');
assert.equal(s.completedWorkouts, 1);

console.log('workout flow tests: OK');
