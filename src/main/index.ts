import Bot from './bot'
import { Manager } from './manager'
import argRules from './argRules'
import Args from './lib/args'

const args = new Args(argRules)

if (args.args.manager && !process.send) {
  console.log('Launched managed bot instance')
  void new Manager()
} else {
  process.on('multipleResolves', (e, p, v) => {
    throw new Error(`Mutiple ${e}s\nvalue: ${v}`)
  })
  process.on('unhandledRejection', (e) => {
    throw e
  })

  const bot = new Bot({ masters: [61365582], args })
  // Pass reference to Bot for debugging if not a managed instance
  if (!process.send) {
    console.log(bot)
  }
}
