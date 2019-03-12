const assert = require('assert')
const fs = require('fs')


process.on('uncaughtException', (e) => {
  console.log(e.message);
  console.log('ERRORED');
  console.log('');
});

console.log('Testing "../bin/src/lib/secretKey"')

var keys = require('../bin/src/lib/secretKey')

fs.writeFileSync('./test/test_keys_temp.json', JSON.stringify({
  testkey1: '_testkey1',
  testkey2: {
    testkey2key: '_testkey2key'
  },
  testkey3: { a: 1 }
}, null, 2))

assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey1'), '_testkey1', 'Key on first load of file is not received') // Key
assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey2', 'testkey2key'), '_testkey2key', 'Deep key is not received') // Deep key
assert.deepStrictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey3'), { a: 1 }, 'Object values are not received') // Returns objects too
assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey4'), undefined, 'Newly created keys dont return undefined') // Created
assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey4'), null, 'Previously created key is not set to null') // Now set to null previously

fs.unlinkSync('./test/test_keys_temp.json') // Delete file

// Test creation of file
assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey4'), undefined, 'Automatic file creation is not working or newly created keys dont return undefined') // Should not exist anymore
assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey0'), undefined, 'Newly created keys dont return undefined') // Created key and file
assert.strictEqual(keys.getKey('./test/test_keys_temp.json', 'testkey0'), null, 'Newly created keys are not set to null') // Now set to null previously

fs.unlinkSync('./test/test_keys_temp.json') // Delete file
console.log('No errors found in secretKey\n')
