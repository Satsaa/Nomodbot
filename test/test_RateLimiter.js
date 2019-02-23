const assert = require('assert')

/*
Incomplete test for RateLimiter.js

+ Passive test
- Queue test

*/

console.log('Testing "../src/lib/RateLimiter"')

var duration = 100
var limit = 3
var delay = 50

var rateLimiter = require('../src/lib/rateLimiter')
var rlPassive = new rateLimiter.Passive({ duration: duration, limit: limit, delay: delay })

// Remaining entries at start when empty
assert.strictEqual(limit, rlPassive.remaining())
// Allow next entry immediately when list empty
assert.strictEqual(0, rlPassive.next())

for (let i = 0; i < limit - 1; i++) { rlPassive.add() } // Fill entry list to 1 less than full

// Remaining entries when partially filled
assert.strictEqual(limit - (limit - 1), rlPassive.remaining())
// Takes delay into account
assert.strictEqual(delay, rlPassive.next())

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

  console.log('No errors found in RateHandler.js')
  // Test end
}, (duration > delay ? duration : delay) + 10)
