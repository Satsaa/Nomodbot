const assert = require('assert')

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

let testType = 'Simple > '
assert.deepStrictEqual(defaultKeys({}, {}), {}, testType + 'Doesn\'t work with empty objects')
assert.deepStrictEqual(defaultKeys({}, []), {}, testType + 'Unexpected array interaction')
assert.deepStrictEqual(defaultKeys({}, {0:1}), {0:1}, testType + 'Default value was not transferred')
assert.deepStrictEqual(defaultKeys({}, [1]), {0:1}, testType + 'Default value was not transferred from array input')
assert.deepStrictEqual(defaultKeys({a:2}, {a:1}), {a:2}, testType + 'Default value was transferred when a value was defined')
assert.deepStrictEqual(defaultKeys({}, {a:undefined}), {a:undefined}, testType + 'Default value which was set to undefined was ignored')
assert.deepStrictEqual(defaultKeys({}, {a:{a:1}}), {a:{a:1}}, testType + 'Not recursive')
assert.deepStrictEqual(defaultKeys({}, {a:{a:{a:1}}}), {a:{a:{a:1}}}, testType + 'Recursive to 1 depth but not 2 depth')
assert.deepStrictEqual(defaultKeys({}, {a:{}}), {a:{}}, testType + 'Recursive works but an object with no keys is not transferred')
assert.deepStrictEqual(defaultKeys({a:[]}, {a:{}}), {a:[]}, testType + 'Default value overrides a value that is an array')
assert.deepStrictEqual(defaultKeys({}, {a:[1,2,3,4,5]}), {a:[1,2,3,4,5]}, testType + 'Array values are not transferred')
assert.deepStrictEqual(defaultKeys({}, {a:[{a:1},{b:1}]}), {a:[{a:1},{b:1}]}, testType + 'Array of objects with a single as default values are not transferred')

console.log('No errors found in defaultKeys\n')
