import fs from 'fs'

import Bot from './bot'
import { Manager, ManagerOptions } from './manager'
import { getArgs } from './argRules'
import logger from './logger'

const errorPath = './data/logs/'
const errorFile = 'fatal.txt'
fs.mkdirSync(errorPath, { recursive: true })

const args = getArgs()
if (Array.isArray(args)) throw args

if (args.args.manager && !process.send) {
  logger.info('Launched using manager')

  const opts: ManagerOptions = {
    noAutoRestart: Boolean(args.args['no-auto-restart']),
    inspect: Boolean(args.args['inspect-child']),
  }
  void new Manager(opts)
} else {
  process.on('multipleResolves', (e, p, v) => {
    const error = new Error(`Multiple ${e}s`)
    logError(error)
    throw error
  })
  process.on('unhandledRejection', (e) => {
    logError(e)
  })

  const bot = new Bot({ masters: [61365582] })
}

function logError(error: any) {
  if (typeof error !== 'object' || error === null) return fs.appendFileSync(`${errorPath}${errorFile}`, error)

  let data = `${new Date()}`
  if (!error.stack) data += `\n${error.code}`
  if (error.code) data += `\n${error.code}`
  if (error.message && !error.stack) data += `\n${error.message}`
  if (error.stack) data += `\n${error.stack}`
  data += '\n\n'
  fs.appendFileSync(`${errorPath}${errorFile}`, data)
}
