const assert = require('assert')
const fs = require('fs')

/*
Fully test for matchKeys.js

Tests most intended use cases

*/

console.log('Testing "../src/lib/matchKeys"')

var matchKeys = require('../src/lib/matchKeys')

assert.strictEqual(matchKeys({}, {}), true)
assert.strictEqual(matchKeys({ a: 1 }, { a: 1 }), true)
assert.strictEqual(matchKeys({ a: {} }, { a: 1 }), true)
assert.strictEqual(matchKeys({ a: 1 }, { a: {} }), true)
assert.strictEqual(matchKeys({ a: {} }, { a: {} }), true)

assert.strictEqual(matchKeys({ a: 1 }, { a: 1 }, { matchValues: true }), true)
assert.strictEqual(matchKeys({ a: {} }, { a: 1 }, { matchValues: true }), false)
assert.strictEqual(matchKeys({ a: 1 }, { a: {} }, { matchValues: true }), false)
assert.strictEqual(matchKeys({ a: {} }, { a: {} }, { matchValues: true }), true)

assert.strictEqual(matchKeys({ a: null }, { a: 1 }), true)
assert.strictEqual(matchKeys({ a: 1 }, { a: null }), true)
assert.strictEqual(matchKeys({ a: null }, { a: null }), true)

assert.strictEqual(matchKeys({ a: 1 }, { a: 1, b: 1 }), true)
assert.strictEqual(matchKeys({ a: 1 }, { a: 1, b: 1 }, { matchValues: true }), true)

assert.strictEqual(matchKeys({ a: { a: { a: { a: { a: 111 } } } } }, { a: { a: { a: { a: { a: 111 } } } } }), true)
assert.strictEqual(matchKeys({ a: { a: { a: { a: { a: 'xxx' } } } } }, { a: { a: { a: { a: { a: 111 } } } } }, { matchValues: true }), false)

assert.strictEqual(matchKeys({ a: 1 }, { a: 1 }, { maxDepth: 0 }), undefined)
assert.strictEqual(matchKeys({ a: 1 }, { a: 1 }, { maxDepth: 1 }), true)

assert.strictEqual(matchKeys({
  a: {},
  b: null,
  c: { d: { e: {} } }
}, {
  a: {},
  b: null,
  c: { d: { e: {} } }
}), true)

assert.strictEqual(matchKeys({
  a: {},
  b: {
    bb: {},
    bbb: { a: 9 }
  },
  c: 'asd'
}, {
  a: {},
  b: {
    bb: {},
    bbb: { a: 1 }
  },
  c: 'asd'
}, { matchValues: true }), false)

assert.strictEqual(matchKeys(new Date(), new Date()), true)

console.log('No errors found in matchKeys.js')
