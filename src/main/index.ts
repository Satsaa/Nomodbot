import Bot from './bot'
import { Manager, ManagerOptions } from './manager'
import { getArgs } from './argRules'

const args = getArgs()
if (Array.isArray(args)) throw args

if (args.args.manager && !process.send) {
  console.log('Launched using manager')

  const opts: ManagerOptions = {
    noAutoRestart: Boolean(args.args['no-auto-restart']),
    inspect: Boolean(args.args['inspect-child']),
  }
  void new Manager(opts)
} else {
  process.on('multipleResolves', (e, p, v) => {
    throw new Error(`Mutiple ${e}s\nvalue: ${v}`)
  })
  process.on('unhandledRejection', (e) => {
    throw e
  })

  const bot = new Bot({ masters: [61365582] })
}
