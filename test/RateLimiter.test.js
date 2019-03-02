const assert = require('assert')

/*
Incomplete test for RateLimiter.js

+ Queue test
  + queue specific tests
  - basic tests
+ Passive test

*/

process.on('uncaughtException', (e) => {
  console.log(e.message);
  console.log('^ERROR^');
  console.log('');
});

console.log('Testing "../src/lib/RateLimiter"')

var duration = 100
var limit = 3
var delay = 50

var RateLimiter = require('../src/lib/RateLimiter').default

var rlQueue = new RateLimiter({ duration: duration, limit: limit, delay: delay, queueSize: 1 })

// Test for queueSize limit enforcement
rlQueue.queue(() => {})
assert.strictEqual(rlQueue._callbacks.length, 1, 'Entries are not added to callback array')
rlQueue.queue(() => {})
assert.strictEqual(rlQueue._callbacks.length, 1, 'Queue size limit is not enforced')
rlQueue.queueSize = 5
for (let i = 0; i < 5; i++) {
  rlQueue.queue(() => {})
}
assert.strictEqual(rlQueue._callbacks.length, 5, 'Queue size limit is not editable')

rlQueue.limit = 999

// Test for calling of callbacks
var test

rlQueue.queueFirst(() => { test = 777 })
setTimeout(() => {
  assert.strictEqual(test, 777, 'Callback without params was not excecuted in time')

  rlQueue.queueFirst((abc) => { test = abc || 555 }, 666)
  setTimeout(() => {
    assert.notStrictEqual(test, 555, 'Callback with params was excecuted in time but params were not passed')
    assert.strictEqual(test, 666, 'Callback with params was not excecuted in time')

    console.log('No errors found in RateLimiter.js')
    console.log('')
   // Test end
  }, (duration > delay ? duration : delay) + 10)
}, Math.max(duration, delay) + 10)
