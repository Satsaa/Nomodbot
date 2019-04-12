import Bot from './Bot'

console.log('Launch')

// Blyat
global.v8debug = {}
global.v8debug.bot = new Bot({masters: [61365582]})

const bot = global.v8debug.bot

process.on('multipleResolves', (e, p, v) => { throw new Error(`Mutiple ${e}s\nvalue: ${v}`) })

process.on('unhandledRejection', (e) => { throw e })
