import * as fs from 'fs'
import * as path from 'path'
import Data from './Data'
import TwitchClient from './lib/Client'
import { IrcMessage } from './lib/parser'
import RateLimiter, { RateLimiterOptions } from './lib/RateLimiter'

export interface CommandOptions {
  type: 'command',
  /** Used for identifying this plugin */
  id: string,
  name: string,
  description: string,
  /** Usage instructions */
  default: [string, Pick<CommandAlias, Exclude<keyof CommandAlias, 'id'>>],
  /** Usage instructions */
  help: string,
  /** Command is succesfully called from chat */
  call: (raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) => Promise<{}>,
  /** Command is called but is ignored due to cooldowns */
  overFlow?: (raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) => void,
}

export interface ControllerOptions {
  type: 'controller',
  /** Used for identifying this plugin */
  id: string,
  name: string,
  title: string,
  description: string,
}

/** Properties for aliases (e.g. !uptime) */
export interface CommandAlias {
  disabled: boolean,
  id: string,
  channelRateLimit: number | RateLimiterOptions,
  globalCooldown: number | RateLimiterOptions,
  userCooldown: number | RateLimiterOptions,
  globalUserCooldown: number | RateLimiterOptions,
}

export default class Commander {
  public commands: {[x: string]: CommandOptions}
  public controllers: {[x: string]: ControllerOptions}
  private defaults: {[x: string]: CommandAlias}
  private client: TwitchClient
  private data: Data // & {static: {default?: {commands: {[x: string]: CommandAlias}}}}

  constructor(client: TwitchClient, data: Data) {
    this.commands = {}
    this.controllers = {}
    this.defaults = {}
    this.client = client
    this.data = data
    this.client.on('message', this.onPrivMessage.bind(this))
  }

  public createAlias(channel: string, alias: string) {

  }

  public deleteAlias(channel: string, alias: string) {

  }

  public enableAlias(channel: string, alias: string) {

  }

  public disableAlias(channel: string, alias: string) {

  }

  public init(): Promise<{loaded: string[], failed: string[]}> {
    this.data.autoLoad('static', 'commands', {})
    return new Promise((resolve, reject) => {
      readDirRecursive('./main/commands/', (err, files) => {
        if (err) return reject(err)
        if (!files || !files.length) return resolve({loaded: [], failed: []})
        const loaded: string[] = []
        const failed: string[] = []
        files.forEach((file) => {
          const plugin: {options: CommandOptions | ControllerOptions} = require(file)
          const options = plugin.options
          if (options) {
            if (options.type === 'command') {
              loaded.push(options.id)
              this.commands[options.id] = options
              this.defaults[options.default[0]] = {...options.default[1], id: options.id}
            } else if (options.type === 'controller') {
              this.controllers[options.id] = options
            }
          } else failed.push(path.basename(file))
        })
        return resolve({loaded, failed})
      })
    })
  }

  private onPrivMessage(raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) {
    const words = message.split(' ')
    if (!this.data.static[channel].commands) return
    if (this.data.static[channel].commands[words[0]]) {
      this.callCommand(this.data.static[channel].commands[words[0]], raw, channel, userstate, message, me)
    } else if (this.defaults[words[0]]) this.callCommand(this.defaults[words[0]], raw, channel, userstate, message, me)
  }

  private async callCommand(command: CommandAlias, raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) {
    const res = await this.commands[command.id].call(raw, channel, userstate, message, me)
    if (typeof res === 'string') this.client.msg(channel, res)
  }
}

function readDirRecursive(dir: string, cb: (err: null | Error, files?: string[]) => void) {
  const result: string[] = []
  fs.readdir(dir, (err, files) => {
    if (err) return cb(err)
    if (!files.length) return cb(null, result)
    let pending = files.length
    files.forEach((file) => {
      file = path.resolve(dir, file)
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          readDirRecursive(file, (err, files) => {
            if (files) result.push(...files)
            if (--pending === 0) return cb(null, result)
          })
        } else {
          result.push(file)
          if (--pending === 0) return cb(null, result)
        }
      })
    })
  })
}
