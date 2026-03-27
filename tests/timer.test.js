const assert = require('node:assert/strict');
const { createTimer } = require('../src/timer.js');

let ticks = 0;
let done = false;

const timer = createTimer({
  onTick: () => { ticks += 1; },
  onDone: () => { done = true; },
});

timer.start(1);

setTimeout(() => {
  assert.equal(ticks >= 1, true);
  assert.equal(done, true);
  console.log('timer tests: OK');
}, 1200);
