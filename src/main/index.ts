import Bot from './Bot'

// Pass reference to Bot for debugging
console.log(new Bot({masters: [61365582]}))

process.on('multipleResolves', (e, p, v) => { throw new Error(`Mutiple ${e}s\nvalue: ${v}`) })

process.on('unhandledRejection', (e) => { throw e })
