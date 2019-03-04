import Expector from '../src/lib/expector';
import assert from 'assert'

var expector = new Expector

console.log('Testing "../src/lib/expector"')

process.on('uncaughtException', (e) => { 
    console.log(e.message)
  console.log('ERRORED\n')
});

var id = expector.expect({test: 1},{once:false} , ()=>{
  throw(new Error('threw'))
})

assert.doesNotThrow(()=>{
  expector.receive({})
}, 'Empty object matched with object with a single key')

assert.doesNotThrow(()=>{
  expector.receive({test: 2})
}, 'options.matchOptions.matchValues ignored')

assert.doesNotThrow(()=>{
  expector.receive({test: true})
}, 'Key with value 1 was considered equal to value true')

assert.doesNotThrow(()=>{
  expector.receive({test: {}})
}, 'options.matchOptions.matchValues ignored when value was {}')

assert.doesNotThrow(()=>{
  expector.receive({test: {}})
}, 'options.matchOptions.matchValues ignored when value was {}')

assert.throws(()=>{
  expector.receive({test: 1})
}, 'Did not match with identical object')

assert.throws(()=>{
  expector.receive({test: 1, a: undefined})
}, 'Did not match with identical object with extra key')

expector.unExpect(id)

id = expector.expect({test: undefined, vest: 1}, {once:false}, ()=>{
  throw(new Error('threw'))
})

assert.throws(()=>{
  expector.receive({test: 'defined', vest: 1})
}, 'options.matchOptions.ignoreUndefined ignored')

assert.throws(()=>{
  expector.receive({test: {}, vest: 1})
}, 'options.matchOptions.ignoreUndefined ignored with value {}')

assert.doesNotThrow(()=>{
  expector.receive({test: 'defined', vest: 2})
}, 'options.matchOptions.ignoreUndefined ignores every value')

expector.unExpect(id)

  
console.log('No errors found in expector\n')
