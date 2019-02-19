const { PerformanceObserver, performance } = require('perf_hooks')
const assert = require('assert')
const parser = require('../src/lib/parser')

/*
Test most situations that parser.js may encounter 

*/

console.log('Testing "../src/lib/parser"')

var msg = '' // Definitely invalid

assert.deepStrictEqual(parser(msg), null)

msg = 'Command' // Single command

assert.deepStrictEqual(parser(msg), {
  tags: {},
  nick: null,
  user: null,
  prefix: null,
  cmd: 'Command',
  params: []
})

msg = ' Command ' // Single command with spaces

assert.deepStrictEqual(parser(msg), {
  tags: {},
  nick: null,
  user: null,
  prefix: null,
  cmd: 'Command',
  params: []
})

msg = ':ex.am.ple.com' // Complicated prefix

assert.deepStrictEqual(parser(msg), {
  tags: {},
  nick: null,
  user: null,
  prefix: 'ex.am.ple.com',
  cmd: null,
  params: []
})

msg = '@a;b=;c=d;d=\\\\\\s\\r\\n\\:' // Irc v3.2 tags specify escaping for values

assert.deepStrictEqual(parser(msg), {
  tags: {
    a: true,
    b: '',
    c: 'd',
    d: '\\ \r\n;'
  },
  nick: null,
  user: null,
  prefix: null,
  cmd: null,
  params: []
})

msg = '@escapedVar\\s\\:\\\n\\r=asd' // Irc v3.2 tags only specify escaping ONLY for values, not keys

assert.deepStrictEqual(parser(msg), {
  tags: {
    'escapedVar\\s\\:\\\n\\r': 'asd'
  },
  nick: null,
  user: null,
  prefix: null,
  cmd: null,
  params: []
})

msg = '@a=\\: :nick!user@ex.com' // Tag with escaping and prefix with nick and user

assert.deepStrictEqual(parser(msg), {
  tags: {
    a: ';'
  },
  nick: 'nick',
  user: 'user',
  prefix: 'nick!user@ex.com',
  cmd: null,
  params: []
})

msg = '@a=\\: :nick!user@ex.com cmd param0 param1 param2' // Previous with command and parameters

assert.deepStrictEqual(parser(msg), {
  tags: {
    a: ';'
  },
  nick: 'nick',
  user: 'user',
  prefix: 'nick!user@ex.com',
  cmd: 'cmd',
  params: [
    'param0',
    'param1',
    'param2'
  ]
})

msg = '@a=\\: :nick!user@ex.com cmd param0 :multi word parameter:;DF:;VDVVM;#¤"¤"££$' // Previous with command and parameters and multi word parameter with ':' in it

assert.deepStrictEqual(parser(msg), {
  tags: {
    a: ';'
  },
  nick: 'nick',
  user: 'user',
  prefix: 'nick!user@ex.com',
  cmd: 'cmd',
  params: [
    'param0',
    'multi word parameter:;DF:;VDVVM;#¤"¤"££$'
  ]
})

msg = ':user@ex.com cmd param0' // Prefix with user but no nick

assert.deepStrictEqual(parser(msg), {
  tags: {},
  nick: null,
  user: 'user',
  prefix: 'user@ex.com',
  cmd: 'cmd',
  params: [
    'param0'
  ]
})

msg = ':nick!ex.com cmd param0' // Prefix with nick but no user

assert.deepStrictEqual(parser(msg), {
  tags: {},
  nick: 'nick',
  user: null,
  prefix: 'nick!ex.com',
  cmd: 'cmd',
  params: [
    'param0'
  ]
})

msg = 'cmd param0 param1 param2' // Command with parameters

assert.deepStrictEqual(parser(msg), {
  tags: {},
  nick: null,
  user: null,
  prefix: null,
  cmd: 'cmd',
  params: [
    'param0',
    'param1',
    'param2'
  ]
})

msg = 'cmd paramAndSpace ' // Command with a parameter that has a space after it

assert.deepStrictEqual(parser(msg), {
  tags: {},
  nick: null,
  user: null,
  prefix: null,
  cmd: 'cmd',
  params: [
    'paramAndSpace'
  ]
})

msg = 'cmd :paramAndSpace ' // Command with a parameter that has a space after it and the param is prefixed

assert.deepStrictEqual(parser(msg), {
  tags: {},
  nick: null,
  user: null,
  prefix: null,
  cmd: 'cmd',
  params: [
    'paramAndSpace '
  ]
})

msg = '@ban-duration=23;room-id=61365582;target-user-id=147764434;tmi-sent-ts=1550286954898 :tmi.twitch.tv CLEARCHAT #satsaa :123asd' // Example

assert.deepStrictEqual(parser(msg), {
  tags: {
    'ban-duration': '23',
    'room-id': '61365582',
    'target-user-id': '147764434',
    'tmi-sent-ts': '1550286954898'
  },
  nick: null,
  user: null,
  prefix: 'tmi.twitch.tv',
  cmd: 'CLEARCHAT',
  params: [
    '#satsaa',
    '123asd'
  ]
})

msg = ' ' // Example

assert.deepStrictEqual(parser(msg), null)

msg = '@badges=subscriber/12;color=#8A2BE2;display-name=gazatu2;emotes=1:21-22;flags=;id=aeaba6d0-bb51-4130-bc51-1a5580c1a95f;mod=0;room-id=22484632;subscriber=1;tmi-sent-ts=1550613701817;turbo=0;user-id=132134724;user-type= :gazatu2!gazatu2@gazatu2.tmi.twitch.tv PRIVMSG #forsen :8/69 category: Anime :) question: What is Sankarea about?' // Speshimen msg'

// Calculate parses per second

let start = performance.now()
for (let i = 0; i < 100000; i++) {
  parser(msg)
}
let end = performance.now()

console.log(`${Math.round(100000 * (1 / (end - start)))}k parses/sec wow!`)

console.log('No errors found in parser')
