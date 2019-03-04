import * as u from '../src/lib/util';
import assert from 'assert'

console.log('Testing "../src/lib/util"')

process.on('uncaughtException', (e) => {
  console.log(e.message)
  console.log('ERRORED')
  console.log('')
});

try {
  assert.strictEqual(typeof u.randomInt(0,99), 'number', 'randomInt(0,99) did not return a number')
  assert.strictEqual(u.randomInt(0,0), 0, 'randomInt(0,0) did not return 0')
  assert.strictEqual(u.randomInt(99,99), 99, 'randomInt(99,99) did not return 99')
} catch (e) {
  if (e)
    console.log(e.message)
} finally {
  console.log('No errors found in randomInt')
}

try {
  assert.strictEqual(u.get(), undefined, 'get() did not return undefined')
  assert.strictEqual(u.get(1), 1, 'get(1) did not return 1')
  assert.strictEqual(u.get(0, 1), 0, 'get(0, 1) did not return first undefined value: 0')
  assert.strictEqual(u.get(undefined, 1), 1, 'get(undefined, 1) did not return first undefined value: 1')
  assert.strictEqual(u.get(undefined, undefined), undefined, 'get(undefined, undefined) did not return undefined')
} catch (e) {
  if (e)
    console.log(e.message)
} finally {
  console.log('No errors found in get')
}

try {
  assert.strictEqual(u.plural(1,'single'), 'single', 'plural(1,\'single\') did not return \'single\'')
  assert.strictEqual(u.plural('1','single'), 'single', 'plural(\'1\',\'single\') did not return \'single\'')
  assert.strictEqual(u.plural(0,'single'), 'singles', "plural(0,'single') did not return 'singles'")
  assert.strictEqual(u.plural(2,'single'), 'singles', "plural(2,'single') did not return 'singles'")
  assert.strictEqual(u.plural(undefined,'single'), 'singles', "plural(undefined,'single') did not return 'singles'")
  assert.strictEqual(u.plural(99,'single','multiple'), 'multiple', "plural(undefined,'single','multiple') did not return 'multiple'")
  assert.strictEqual(u.plural(1,1), 1, "plural(99,1) did not return 1")
  assert.strictEqual(u.plural(99,1), '1s', "plural(99,1) did not return '1s'")
  assert.strictEqual(u.plural(99,1,2), 2, "plural(99,1,2) did not return 2")
} catch (e) {
  if (e)
    console.log(e.message)
} finally {
  console.log('No errors found in plural')
}


console.log('Finished tests for util\n')