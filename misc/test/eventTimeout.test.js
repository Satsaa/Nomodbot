const assert = require('assert')
var EventEmitter = require('events').EventEmitter
var eventTimeout = require('../bin/src/lib/eventTimeout').default

console.log('Testing "../bin/src/lib/eventTimeout"')

process.on('uncaughtException', (e) => {
  console.log(e.message)
  console.log('ERRORED')
  console.log('')
});

let emitter = new EventEmitter()

test()

async function test(){
  assert.strictEqual((await eventTimeout(emitter, 'event', {timeout: 100})).timeout, true, 'Does\'t timeout')
  
  let promise = eventTimeout(emitter, 'event')
  emitter.emit('event')
  assert.strictEqual((await promise).timeout, false, 'Does\'t resolve on event')
  
  promise = eventTimeout(emitter, 'event', {matchArgs: [1]})
  emitter.emit('event', 2)
  emitter.emit('event', 1)
  assert.deepStrictEqual((await promise).args, [1], 'Match args options does\'t work')

  promise = eventTimeout(emitter, 'event', {matchArgs: [1,2]})
  emitter.emit('event', 1,1)
  emitter.emit('event', 1,2)
  assert.deepStrictEqual((await promise).args, [1,2], 'Match args options does\'t work with multiple arguments')

  promise = eventTimeout(emitter, 'event', {matchArgs: [{a:1}]})
  emitter.emit('event', {a:2, b:1})
  emitter.emit('event', {a:1, b:1})
  assert.deepStrictEqual((await promise).args, [{a:1, b:1}], 'Match args options does\'t work with objects')
  console.log('Finished tests for eventTimeout\n')
}
