const assert = require('assert')
const util = require('../bin/src/lib/util')

process.on('uncaughtException', (e) => {
  console.log(e.message)
  console.log('ERRORED')
  console.log('')
})

console.log('Testing "../bin/src/lib/defaultKeys"')

let _defaultKeys = require('../bin/src/lib/defaultKeys').default
function defaultKeys(obj1, obj2){
  _defaultKeys(obj1,obj2)
  return obj1
}

assert.deepStrictEqual(defaultKeys({}, {}), {}, 'Doesn\'t work with empty objects')
assert.deepStrictEqual(defaultKeys({}, []), {}, 'Unexpected array interaction')
assert.deepStrictEqual(defaultKeys({}, {0:1}), {0:1}, 'Default value was not transferred')
assert.deepStrictEqual(defaultKeys({}, [1]), {0:1}, 'Default value was not transferred from array input')

assert.deepStrictEqual(defaultKeys([], [1]), [1], 'Default value was not transferred from array input to an array')
assert.deepStrictEqual(defaultKeys([], [[1]]), [[1]], 'Array values are not transferred if they are arrays')
assert.deepStrictEqual(defaultKeys({a:[]}, {a:[[1]]}), {a:[[1]]}, 'Deep array values are not transferred if they are in an object')

assert.deepStrictEqual(defaultKeys({a:2}, {a:1}), {a:2}, 'Default value was transferred when a value was defined')
assert.deepStrictEqual(defaultKeys({}, {a:undefined}), {a:undefined}, 'Default value which was set to undefined was ignored')
assert.deepStrictEqual(defaultKeys({}, {a:{a:1}}), {a:{a:1}}, 'Not recursive')
assert.deepStrictEqual(defaultKeys({}, {a:{a:{a:1}}}), {a:{a:{a:1}}}, 'Recursive to 1 depth but not 2 depth')
assert.deepStrictEqual(defaultKeys({}, {a:{}}), {a:{}}, 'Recursive works but an object with no keys is not transferred')
assert.deepStrictEqual(defaultKeys({a:[]}, {a:{}}), {a:[]}, 'Default value overrides a value that is an array')

assert.deepStrictEqual(defaultKeys({}, {a:[1,2,3,4,5]}), {a:[1,2,3,4,5]}, 'Arrays values are not transferred')
assert.deepStrictEqual(defaultKeys({a:[9,8]}, {a:[1,2,3,4,5]}), {a:[9,8,3,4,5]}, 'Partial array values are overwritten')
assert.deepStrictEqual(defaultKeys({a:{b:8}}, {a:{a:1,b:2}}), {a:{a:1,b:8}}, 'Partial object key values are overwritten')
assert.deepStrictEqual(defaultKeys({}, {a:[{a:1},{b:1}]}), {a:[{a:1},{b:1}]}, 'Array values are not transferred if they are objects')

let _obj1 = {}
let _obj2 = {a:{b:{}}}
assert.deepStrictEqual(defaultKeys(_obj1, _obj2), {a:{b:{}}}, 'Not recursive (2.)')
_obj1.a = 999 // Should not change value in obj2
assert.deepStrictEqual(_obj2, {a:{b:{}}}, 'An object reference was copied')

try {
  let obj1 = {}
  obj1.a = obj1
  let obj2 = {b: 'huh'}
  obj2.a = obj2
  assert.deepStrictEqual(defaultKeys(obj1, obj2), obj2, 'Not strictly equal')
  if (util.containsSharedReference(obj1, obj2)) throw new Error('Reference value copied')
} catch (e) {
  throw new Error('Cannot handle circular objects: ' + e)
}

try {
  let obj1 = {}
  let obj2 = {a: {}}
  assert.deepStrictEqual(defaultKeys(obj1, obj2), obj2, 'Not strictly equal')
  if (util.containsSharedReference(obj1, obj2)) throw new Error('Reference value copied')
} catch (e) {
  throw new Error('Cannot handle nested circular objects: ' + e)
}

try {
  let obj1 = {}
  let obj2 = {a: {}, b:{}}
  assert.deepStrictEqual(defaultKeys(obj1, obj2), obj2, 'Not strictly equal')
  if (util.containsSharedReference(obj1, obj2)) throw new Error('Reference value copied')
} catch (e) {
  throw new Error('Cannot handle multiple nested circular objects: ' + e)
}

try {
  let array1 = []
  array1[0] = array1
  let array2 = []
  array2[0] = array2
  assert.deepStrictEqual(defaultKeys(array1, array2), array2, 'Not strictly equal')
  if (util.containsSharedReference(array1, array2)) throw new Error('Reference value copied')
} catch (e) {
  throw new Error('Cannot handle circular arrays: ' + e)
}

var a = {
  global: {
    whisperTimes: [],
    msgTimes: []
  },
  channels: {}
}
var b = {
  global: {
    whisperTimes: [
      [
        1552887483532,
        1552887483534,
      ],
      [
        1552887490541,
        1552887490544,
        1552887491541
      ]
    ],
    msgTimes: [
      []
    ]
  },
  channels: {
    '#satsaa': {
      phase: false
    }
  }
}
assert.deepStrictEqual(defaultKeys(a, b), a, 'Array of objects with a single as default values are not transferred')



console.log('No errors found in defaultKeys\n')
