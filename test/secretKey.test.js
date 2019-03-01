const assert = require('assert')
const fs = require('fs')

/*
Satisfying test for keys.js

Tests most intended use cases

*/

console.log('Testing "../src/lib/secretKey"')

var keys = require('../src/lib/secretKey')

fs.writeFileSync('./test/test_keys_temp.json', JSON.stringify({
  testkey1: '_testkey1',
  testkey2: {
    testkey2key: '_testkey2key'
  },
  testkey3: { a: 1 }
}, null, 2))

assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey1'), '_testkey1') // Key
assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey2', 'testkey2key'), '_testkey2key') // Deep key
assert.deepStrictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey3'), { a: 1 }) // Returns objects too
assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey4'), undefined) // Created
assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey4'), null) // Now set to null previously

fs.unlinkSync('./test/test_keys_temp.json') // Delete file

// Test creation of file
assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey4'), undefined) // Should not exist anymore
assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey0'), undefined) // Created key and file
assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey0'), null) // Now set to null previously

fs.unlinkSync('./test/test_keys_temp.json') // Delete file
console.log('No errors found in secretKey.js')
