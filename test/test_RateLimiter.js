const assert = require('assert')

/*
Incomplete test for RateLimiter.js

*/

var duration = 100
var limit = 3
var delay = 50

var RateLimiter = require('../src/lib/RateLimiter')
var rateLimiter = new RateLimiter({ duration: duration, limit: limit, delay: delay })

// Allow next entry immediately when list empty
assert.strictEqual(0, rateLimiter.next())

// Returns correct remaining entries when empty
assert.strictEqual(limit, rateLimiter.remaining())

// Fill entry list to 1 less than full
for (let i = 0; i < limit - 1; i++) { rateLimiter.add() }

// Takes delay into account
assert.strictEqual(delay, rateLimiter.next())

// Returns correct remaining entries when partially filled
assert.strictEqual(limit - (limit - 1), rateLimiter.remaining())

// Fill entry list to full
rateLimiter.add()

// Returns correct remaining entries when full
assert.strictEqual(0, rateLimiter.remaining())

// Returns correct remaining time until next possible entry. Allows slight variation
assert.strictEqual(Math.ceil((duration > delay ? duration : delay) / 10), Math.ceil(rateLimiter.next() / 10))

setTimeout(() => {
  // Allow next entry immediately when list empty
  assert.strictEqual(0, rateLimiter.next())
  // Returns correct remaining entries when empty
  assert.strictEqual(limit, rateLimiter.remaining())

  console.log('Finished RateHandler Tests')
  // Test end
}, (duration > delay ? duration : delay) + 10)
