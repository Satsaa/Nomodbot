import Bot from './Bot'

console.log('Launch')

// Blyat
global.v8debug = {}
global.v8debug.bot = new Bot({masters: ['satsaa']})

const bot = global.v8debug.bot

process.on('multipleResolves', (e, p, v) => { throw new Error(`Mutiple ${e}s\nvalue: ${v}`) })

process.on('unhandledRejection', (e) => { throw e })
