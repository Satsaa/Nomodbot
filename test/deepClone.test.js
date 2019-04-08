const assert = require('assert')
const util = require('../bin/src/lib/util')

process.on('uncaughtException', (e) => {
  console.log(e.message)
  console.log('ERRORED')
  console.log('')
})

console.log('Testing "../bin/src/lib/deepClone"')

let _deepClone = require('../bin/src/lib/deepClone').default
function deepClone(obj){
  return _deepClone(obj)
}

let obj
let res

obj = {}
res = deepClone(obj)
assert.deepStrictEqual(res, obj, 'Empty object test fail')
res.cloneTest = 999
assert.notDeepStrictEqual(res, obj, 'Empty object test fail (a reference value was copied)')

obj = {a:1}
res = deepClone(obj)
assert.deepStrictEqual(res, obj, 'Object with single key fail')
res.cloneTest = 999
assert.notDeepStrictEqual(res, obj, 'Object with single key fail (a reference value was copied)')

obj = {a:[]}
res = deepClone(obj)
assert.deepStrictEqual(res, obj, 'Object with array key fail')
res.cloneTest = 999
assert.notDeepStrictEqual(res, obj, 'Object with array key fail (a reference value was copied)')

obj = {a:[1]}
res = deepClone(obj)
assert.deepStrictEqual(res, obj, 'Object with object key with array value fail')
res.cloneTest = 999
assert.notDeepStrictEqual(res, obj, 'Object with object key with array value fail (a reference value was copied)')

obj = {a:{b:1}}
res = deepClone(obj)
assert.deepStrictEqual(res, obj, 'Deep primitive fail')
res.a.cloneTest = 999
assert.notDeepStrictEqual(res, obj, 'Deep primitive fail (a reference value was copied)')

obj = {a:{b:[1,undefined]}}
res = deepClone(obj)
assert.deepStrictEqual(res, obj, 'Undefined array index fail')
res.cloneTest = 999
assert.notDeepStrictEqual(res, obj, 'Undefined array index fail (a reference value was copied)')

obj = [1,2,3]
res = deepClone(obj)
assert.deepStrictEqual(res, obj, 'Simple array fail')
res[4] = 999
assert.notDeepStrictEqual(res, obj, 'Simple array fail (a reference value was copied)')

obj = [1,2,3]
obj[9] = 9
res = deepClone(obj)
assert.deepStrictEqual(res, obj, 'Sparse array fail')
res[99] = 99
assert.notDeepStrictEqual(res, obj, 'Sparse array fail (a reference value was copied)')

obj = [{a:1}]
res = deepClone(obj)
assert.deepStrictEqual(res, obj, 'Array with object index fail')
res[0].cloneTest = 999
assert.notDeepStrictEqual(res, obj, 'Array with object index fail (a reference value was copied)')

obj = {a: [1, undefined, 3], b: [{a: 1}, {a: []}], c: undefined, d:{}}
res = deepClone(obj)
assert.deepStrictEqual(res, obj, 'Complex object fail')
res.b = 999
assert.notDeepStrictEqual(res, obj, 'Complex object fail (a reference value was copied)')

obj = [[1, undefined, 3], [{a: 1}, {a: []}], {}]
res = deepClone(obj)
assert.deepStrictEqual(res, obj, 'Complex array fail')
res.b = 999
assert.notDeepStrictEqual(res, obj, 'Complex array fail (a reference value was copied)')

try {
  obj = {}
  obj.a = obj
  res = deepClone(obj)
  assert.deepStrictEqual(res, obj, 'Clone is not identical')
  if (util.hasSharedReference(obj, res)) throw new Error('a reference value was copied')
} catch (e) {
  throw new Error('Circular object fail: ' + e)
}

try {
  obj = {b:{}}
  obj.b.a = obj.b
  res = deepClone(obj)
  assert.deepStrictEqual(res, obj, 'Clone is not identical')
  if (util.hasSharedReference(obj, res)) throw new Error('a reference value was copied')
} catch (e) {
  throw new Error('Nested circular object fail: ' + e)
}

try {
  obj = {a:{},b:{}}
  obj.a.a = obj.a
  obj.b.a = obj.b
  res = deepClone(obj)
  assert.deepStrictEqual(res, obj, 'Clone is not identical')
  if (util.hasSharedReference(obj, res)) throw new Error('a reference value was copied')
} catch (e) {
  throw new Error('Multiple nested circular objects fail: ' + e)
}

try {
  obj = {a:{},b:{}}
  obj.a.a = obj.a
  obj.b.a = obj.a
  res = deepClone(obj)
  assert.deepStrictEqual(res, obj, 'Clone is not identical')
  if (util.hasSharedReference(obj, res)) throw new Error('a reference value was copied')
} catch (e) {
  throw new Error('Multiple nested circular objects fail: ' + e)
}

try {
  obj = []
  obj[0] = obj
  res = deepClone(obj)
  assert.deepStrictEqual(res, obj, 'Clone is not identical')
  if (util.hasSharedReference(obj, res)) throw new Error('a reference value was copied')
} catch (e) {
  throw new Error('Circular array fail: ' + e)
}

console.log('No errors found in defaultKeys\n')
