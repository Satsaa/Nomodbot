const assert = require('assert')
const fs = require('fs')

/*
Fully test for matchKeys.js

Tests most intended use cases

*/

process.on('uncaughtException', (e) => {
  console.log(e.message);
  console.log('^ERROR^');
  console.log('');
});


console.log('Testing "../src/lib/matchKeys"')

var matchKeys = require('../src/lib/matchKeys').default

var testType = 'Simple > '
assert.strictEqual(matchKeys({}, {}), true, testType + 'Failed on empty objects: {} = {}')
assert.strictEqual(matchKeys({ a: 1 }, { a: 1 }), true, testType + 'Failed on objects with keys: { a: 1 } = { a: 1 }')
assert.strictEqual(matchKeys({ a: {} }, { a: 1 }), true, testType + 'Failed on objects with keys: { a: {} } = { a: 1 }')
assert.strictEqual(matchKeys({ a: 1 }, { a: {} }), true, testType + 'Failed on objects with keys: { a: 1 } = { a: {} }')
assert.strictEqual(matchKeys({ a: {} }, { a: {} }), true, testType + 'Failed on objects with keys: { a: {} } = { a: {} }')

var testType = 'matchValues: true > '
assert.strictEqual(matchKeys({ a: 1 }, { a: 1 }, { matchValues: true }), true, testType + 'Failed on objects with keys: { a: 1 } = { a: 1 }')
assert.strictEqual(matchKeys({ a: {} }, { a: 1 }, { matchValues: true }), false, testType + 'Failed on objects with keys: { a: {} } != { a: 1 }')
assert.strictEqual(matchKeys({ a: 1 }, { a: {} }, { matchValues: true }), false, testType + 'Failed on objects with keys: { a: 1 } != { a: {} }')
assert.strictEqual(matchKeys({ a: {} }, { a: {} }, { matchValues: true }), true, testType + 'Failed on objects with keys: { a: {} } = { a: {} }')

var testType = 'Null > '
assert.strictEqual(matchKeys({ a: null }, { a: 1 }), true, testType + 'Failed on objects with keys: { a: null } = { a: 1 }')
assert.strictEqual(matchKeys({ a: 1 }, { a: null }), true, testType + 'Failed on objects with keys: { a: 1 } = { a: null }')
assert.strictEqual(matchKeys({ a: null }, { a: null }), true, testType + 'Failed on objects with keys: { a: null } = { a: null }')
assert.strictEqual(matchKeys({ a: 1 }, { a: null }, { matchValues: true }), false, 'matchValues: true > Failed on objects with keys: { a: 1 } != { a: null }')

var testType = 'Simple multikey > '
assert.strictEqual(matchKeys({ a: 1 }, { a: 1, b: 1 }), true, testType + 'Failed on objects with keys: { a: 1 } = { a: 1, b: 1 }')
assert.strictEqual(matchKeys({ a: 1 }, { a: 1, b: 1 }, { matchValues: true }), true, testType + 'matchValues: true > Failed on objects with keys: { a: 1 } = { a: 1, b: 1 }')

var testType = 'Deep > '
assert.strictEqual(matchKeys({ a: { a: { a: { a: { a: 111 } } } } }, { a: { a: { a: { a: { a: 111 } } } } }), true, testType + ' Failed on identical objects with deep keys')
assert.strictEqual(matchKeys({ a: { a: { a: { a: { a: 'xxx' } } } } }, { a: { a: { a: { a: { a: 111 } } } } }, { matchValues: true }), false, testType + 'matchValues: true > Failed on objects with different deep keys')

var testType = 'MaxDepth: >=0 > '
assert.strictEqual(matchKeys({ a: 1 }, { b: 1 }, { maxDepth: 0 }), true, testType + 'maxDepth: 0 > Failed on objects with different keys: { a: 1 } = { b: 1 }')
assert.strictEqual(matchKeys({ a: 1 }, { b: 1 }, { maxDepth: 1 }), false, testType + 'maxDepth: 1 > Failed on objects with different keys: { a: 1 } != { b: 1 }')
assert.strictEqual(matchKeys({ a: { a: 1 } }, { a: { b: 1 } }, { maxDepth: 1 }), true, testType + 'maxDepth: 1 > Failed on objects with different keys: {a:{ a: 1 }}, {a:{ b: 1 }}')

var testType = 'Array > '
assert.strictEqual(matchKeys([], []), true, testType +'Failed on empty arrays: [] = []')
assert.strictEqual(matchKeys([[[]]], [[[]]], { matchValues: true }), true, testType + 'matchValues: true > Failed on empty deep arrays: [[[]]] = [[[]]]')
assert.strictEqual(matchKeys([[[]]], [], { matchValues: true }), false, testType + 'matchValues: true > Failed on different deep empty arrays: [[[]]] != []')
assert.strictEqual(matchKeys([[[]]], [], { matchValues: true, ignoreUndefined: true }), false, testType + 'matchValues: true, ignoreUndefined: true > Failed on different deep empty arrays: [[[]]] != []')
assert.strictEqual(matchKeys({ a: [] }, { a: [] }), true, testType + 'Failed on empty arrays in object: { a: [] } = { a: [] }')
assert.strictEqual(matchKeys({ a: [2] }, { a: [1] }), true, testType + 'Failed on arrays in object: { a: [2] } = { a: [1] }')
assert.strictEqual(matchKeys({ a: [2] }, { a: [1] }, { matchValues: true }), false, testType + 'matchValues: true > Failed on arrays in object: { a: [2] } != { a: [1] }')
assert.strictEqual(matchKeys({ a: [1, { b: 3 }] }, { a: [1, { b: 3 }] }, { matchValues: true }), true, testType + 'matchValues: true > Failed on identical: object -> array -> object.key=3')
assert.strictEqual(matchKeys({ a: [1, { b: 3 }] }, { a: [1, { b: 77 }] }, { matchValues: true }), false, testType + 'matchValues: true > Failed on non-identical: object -> array -> object.key=3|77')
assert.strictEqual(matchKeys({ a: [1, { b: false }] }, { a: [1, { b: true }] }, { maxDepth: 2, matchValues: true }), true, testType + 'maxDepth: 2, matchValues: true > maxDepth is incorrect in object array mix: { a: [1, { b: false }] } = { a: [1, { b: true }] }')

var testType = 'Arrays is treated as objects > '
assert.strictEqual(matchKeys([], {}), true, testType + '[] = {}')
assert.strictEqual(matchKeys({}, []), true, testType + '{} = []')
assert.strictEqual(matchKeys({ 0: {} }, [[]], { matchValues: true }), true, testType + 'Failed on array index test: { 0: {} } = [[]]')
assert.strictEqual(matchKeys({ 0: 1 }, [1]), true, testType + 'Failed on array index test: { 0: 1 } = [1]')

var testType = 'ignoreUndefined & matchValues > '
assert.strictEqual(matchKeys({ a: undefined, b: false }, { a: 1, b: false }, { matchValues: true, ignoreUndefined: true }), true, testType + '{ a: undefined, b: false } = { a: 1, b: false }')
assert.strictEqual(matchKeys({ a: undefined, b: false }, { a: {}, b: false }, { matchValues: true, ignoreUndefined: true }), true, testType + 'ignoreUndefined doesnt ignore empty objects: { a: undefined, b: false } = { a: {}, b: false }')
assert.strictEqual(matchKeys({ a: undefined, b: true }, { a: 1, b: false }, { matchValues: true, ignoreUndefined: true }), false, testType + 'ignoreUndefined ignores other values: { a: undefined, b: true } != { a: 1, b: false }')
assert.strictEqual(matchKeys({ a: undefined, b: true }, { b: false }, { matchValues: true, ignoreUndefined: true }), false, testType + 'ignoreUndefined ignores the key completely: { a: undefined, b: true } != { b: false }')

var testType = 'Big boys > '
assert.strictEqual(matchKeys({
  a: {},
  b: null,
  c: { d: { e: {} } }
}, {
  a: {},
  b: null,
  c: { d: { e: {} } }
}), true, testType + 'Failed on identical objects with multiple values and depth')

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
}, { matchValues: true }), false, testType + 'Failed on identical objects by keys with different values and depth')

var testType = 'new Date object > '
assert.strictEqual(matchKeys(new Date(), new Date()), true, testType + 'Failed on identical Date objects')

console.log('No errors found in matchKeys.js')
console.log('')
