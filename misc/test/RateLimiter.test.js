const assert = require('assert')


process.on('uncaughtException', (e) => {
  console.log(e.message);
  console.log(e.stack);
  console.log('ERRORED');
  console.log('');
});

console.log('Testing "../bin/src/lib/RateLimiter"')

var duration = 100
var limit = 3
var delay = 50

var RateLimiter = require('../bin/src/lib/RateLimiter').default

var rlQueue = new RateLimiter({ duration: duration, limit: limit, delay: delay, queueSize: 1 })

// Test for queueSize limit enforcement
rlQueue.queue(() => {})
assert.strictEqual(rlQueue.callbacks.length, 1, 'Entries are not added to callback array. Returned ' + rlQueue.callbacks.length)
rlQueue.queue(() => {})
assert.strictEqual(rlQueue.callbacks.length, 1, 'Queue size limit is not enforced. Returned ' + rlQueue.callbacks.length)
rlQueue.queueSize = 5
for (let i = 0; i < 5; i++) {
  rlQueue.queue(() => {})
}
assert.strictEqual(rlQueue.callbacks.length, 5, 'Queue size limit is not editable. Returned ' + rlQueue.callbacks.length)

rlQueue.opts.limit = 999

// Test for calling of callbacks
var test

rlQueue.queueFirst(() => { test = 777 })
setTimeout(() => {
  assert.strictEqual(test, 777, 'Callback without params was not excecuted in time. Returned ' + test)

  rlQueue.queueFirst((abc) => { test = abc || 555 }, 666)
  setTimeout(() => {
    assert.notStrictEqual(test, 555, 'Callback with params was excecuted in time but params were not passed. Returned ' + test)
    assert.strictEqual(test, 666, 'Callback with params was not excecuted in time. Returned ' + test)

    setTimeout(() => {
      rlQueue.queue(() => {}) // refresh
      assert.strictEqual(rlQueue.times[0].length, 0, 'Entries are not deleted after timeout. Returned ' + rlQueue.times[0].length)
      console.log('No errors found in RateLimiter\n')
      // Test end
    },Math.max(duration, delay) * 1.5 )
  }, Math.max(duration, delay) + 10 + 10)
}, Math.max(duration, delay) + 10)
