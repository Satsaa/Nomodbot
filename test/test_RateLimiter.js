const assert = require('assert')

/*
Incomplete test for RateLimiter.js

*/

console.log('Testing "../src/lib/RateLimiter"')

var duration = 100
var limit = 3
var delay = 50

var RateLimiter = require('../src/lib/RateLimiter')
var rateLimiter = new RateLimiter({ duration: duration, limit: limit, delay: delay })

// Remaining entries at start when empty
assert.strictEqual(limit, rateLimiter.remaining())
// Allow next entry immediately when list empty
assert.strictEqual(0, rateLimiter.next())

for (let i = 0; i < limit - 1; i++) { rateLimiter.add() } // Fill entry list to 1 less than full

// Remaining entries when partially filled
assert.strictEqual(limit - (limit - 1), rateLimiter.remaining())
// Takes delay into account
assert.strictEqual(delay, rateLimiter.next())

rateLimiter.add() // Fill entry list to full

// Remaining entries when full
assert.strictEqual(0, rateLimiter.remaining())
// Remaining time until next possible entry. Allows slight variation
assert.strictEqual(Math.ceil((duration > delay ? duration : delay) / 10), Math.ceil(rateLimiter.next() / 10))

setTimeout(() => {
  // Remaining entries when empty
  assert.strictEqual(limit, rateLimiter.remaining())
  // Allow next entry immediately when list empty
  assert.strictEqual(0, rateLimiter.next())

  console.log('No errors found in RateHandler.js')
  // Test end
}, (duration > delay ? duration : delay) + 10)
