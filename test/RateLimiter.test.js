const assert = require('assert')

/*
Incomplete test for RateLimiter.js

+ Queue test
  + queue specific tests
  - basic tests
+ Passive test

*/

console.log('Testing "../src/lib/RateLimiter"')

var duration = 100
var limit = 3
var delay = 50

var RateLimiter = require('../src/lib/rateLimiter').default
var ManualRateLimiter = require('../src/lib/rateLimiter').ManualRateLimiter

var rlQueue = new RateLimiter({ duration: duration, limit: limit, delay: delay, queueSize: 1 })

// Test for queueSize limit enforcement
rlQueue.queue(() => {})
assert.strictEqual(rlQueue._callbacks.length, 1)
rlQueue.queue(() => {})
assert.strictEqual(rlQueue._callbacks.length, 1)
rlQueue.queueSize = 5
for (let i = 0; i < 5; i++) {
  rlQueue.queue(() => {})
}
assert.strictEqual(rlQueue._callbacks.length, 5)

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

    /// Test for passive rateLimiter //////////////////////////////////////////////////////

    var rlPassive = new ManualRateLimiter({ duration: duration, limit: limit, delay: delay })

    // Remaining entries at start when empty
    assert.strictEqual(limit, rlPassive.remaining())
    // Allow next entry immediately when list empty
    assert.strictEqual(0, rlPassive.next())

    for (let i = 0; i < limit - 1; i++) { rlPassive.add() } // Fill entry list to 1 less than full

    // Remaining entries when partially filled
    assert.strictEqual(limit - (limit - 1), rlPassive.remaining())
    // Takes delay into account
    assert.strictEqual(delay / 10, Math.ceil(rlPassive.next() / 10))

    rlPassive.add() // Fill entry list to full

    // Remaining entries when full
    assert.strictEqual(0, rlPassive.remaining())
    // Remaining time until next possible entry. Allows slight variation
    assert.strictEqual(Math.ceil((duration > delay ? duration : delay) / 10), Math.ceil(rlPassive.next() / 10))

    setTimeout(() => {
      // Remaining entries when empty
      assert.strictEqual(limit, rlPassive.remaining())
      // Allow next entry immediately when list empty
      assert.strictEqual(0, rlPassive.next())

      console.log('No errors found in rateHandler.js')
      console.log('\n')
      // Test end
    }, (duration > delay ? duration : delay) + 10)
  }, Math.max(duration, delay) + 10)
}, Math.max(duration, delay) + 10)
