import Bot from './bot'
import { Manager } from './manager'
import { getArgs } from './argRules'

const args = getArgs()
if (Array.isArray(args)) throw args

const test = args.args.manager

if (args.args.manager && !process.send) {
  console.log('Launched managed bot instance')
  void new Manager(args.args['no-auto-restart'] ? { noAutoRestart: true } : undefined)
} else {
  process.on('multipleResolves', (e, p, v) => {
    throw new Error(`Mutiple ${e}s\nvalue: ${v}`)
  })
  process.on('unhandledRejection', (e) => {
    throw e
  })

  const bot = new Bot({ masters: [61365582] })
  // Pass reference to Bot for debugging if not a managed instance
  if (!process.send) {
    console.log(bot)
  }
}
