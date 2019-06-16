import Bot from './Bot'

const bot = new Bot({masters: [61365582]})
if (!process.send) { // Managed instance? Debugging is not active
  // Pass reference to Bot for debugging
  console.log(bot)
}

process.on('multipleResolves', (e, p, v) => { throw new Error(`Mutiple ${e}s\nvalue: ${v}`) })

process.on('unhandledRejection', (e) => { throw e })
