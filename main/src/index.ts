import Bot from './Bot'

// Blyat
global.v8debug = {}
global.v8debug.bot = new Bot()

const bot = global.v8debug.bot

process.on('multipleResolves', (up) => { throw new Error('Mutiple resolves: ' + up) })

process.on('unhandledRejection', (up) => { throw up })
