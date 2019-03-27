const assert = require('assert')
var u = require('../bin/src/lib/util')

console.log('Testing "../bin/src/lib/util"')

process.on('uncaughtException', (e) => {
  console.log(e.message)
  console.log('ERRORED')
  console.log('')
});

try {
  assert.strictEqual(typeof u.randomInt(0,99), 'number', 'randomInt(0,99) did not return a number')
  assert.strictEqual(u.randomInt(0,0), 0, 'randomInt(0,0) did not return 0')
  assert.strictEqual(u.randomInt(99,99), 99, 'randomInt(99,99) did not return 99')
  assert.strictEqual(u.randomInt(0.1,1.9), 1, 'randomInt(0.1,1.9) did not return 1')
  assert.strictEqual(u.randomInt(0,0.9), 0, 'randomInt(0,0.9) did not return 0')
  console.log('No errors found in randomInt')
} catch (e) {
  if (e){
    console.log(e.message)
    console.log('Errors found in randomInt')
}}

try {
  assert.strictEqual(typeof u.randomFloat(0,99), 'number', 'randomFloat(0,99) did not return a number')
  assert.strictEqual(u.randomFloat(0,0), 0, 'randomFloat(0,0) did not return 0')
  assert.strictEqual(u.randomFloat(99,99), 99, 'randomFloat(99,99) did not return 99')
  console.log('No errors found in randomFloat')
} catch (e) {
  if (e){
    console.log(e.message)
    console.log('Errors found in randomFloat')
}}

try {
  assert.strictEqual(u.get(), undefined, 'get() did not return undefined')
  assert.strictEqual(u.get(1), 1, 'get(1) did not return 1')
  assert.strictEqual(u.get(0, 1), 0, 'get(0, 1) did not return first undefined value: 0')
  assert.strictEqual(u.get(undefined, 1), 1, 'get(undefined, 1) did not return first undefined value: 1')
  assert.strictEqual(u.get(undefined, undefined), undefined, 'get(undefined, undefined) did not return undefined')
  console.log('No errors found in get')
} catch (e) {
  if (e){
    console.log(e.message)
    console.log('Errors found in get')
}}

try {
  assert.strictEqual(u.plural(1,'single'), '1 single', 'plural(1,\'single\') did not return \'1 single\'')
  assert.strictEqual(u.plural('1','single'), '1 single', 'plural(\'1\',\'single\') did not return \'1 single\'')
  assert.strictEqual(u.plural(0,'single'), '0 singles', "plural(0,'single') did not return '0 singles'")
  assert.strictEqual(u.plural(2,'single'), '2 singles', "plural(2,'single') did not return '2 singles'")
  assert.strictEqual(u.plural(undefined,'single'), 'undefined singles', "plural(undefined,'single') did not return 'undefined singles'")
  assert.strictEqual(u.plural(99,'single','multiple'), '99 multiple', "plural(undefined,'single','multiple') did not return '99 multiple'")
  assert.strictEqual(u.plural(1,1), "1 1", "plural(99,1) did not return '1 1'")
  assert.strictEqual(u.plural(99,1), '99 1s', "plural(99,1) did not return '99 1s'")
  assert.strictEqual(u.plural(99,1,2), "99 2", "plural(99,1,2) did not return '99 2'")
  console.log('No errors found in plural')
} catch (e) {
  if (e){
    console.log(e.message)
    console.log('Errors found in plural')
}}


console.log('Finished tests for util\n')