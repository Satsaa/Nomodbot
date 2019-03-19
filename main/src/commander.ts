import * as path from 'path'
import Data from './Data'
import TwitchClient from './lib/Client'
import { IrcMessage } from './lib/parser'
import { readDirRecursive } from './lib/util'

export interface Command {
  type: 'command',
  /** Unique id for identifying this plugin */
  id: string,
  name: string,
  description: string,
  /** [default command alias, CommandAlias options] */
  default: [string, Pick<CommandAlias, Exclude<keyof CommandAlias, 'id'>>],
  /** Usage instructions */
  help: string,
  /** Command is not enabled before these data types are loaded */
  require?: string[]
  actions: {
    /** When a command is succesfully called */
    call: (raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) => Promise<{}>,
    /** When a command is called but is ignored due to a cooldown */
    cooldown?: (raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) => void,
    /** The bot joins a channel */
    join?: (raw: IrcMessage, channel: string) => void,
    /** The bot parts a channel */
    part?: (raw: IrcMessage, channel: string) => void,
    // /** A user joins a channel */
    // userJoin?: (raw: IrcMessage, channel: string, user: string) => void,
    // /** A user parts a channel */
    // userPart?: (raw: IrcMessage, channel: string, user: string) => void,
  }
}

/** Controls a data type or something like that */
export interface Controller {
  type: 'controller',
  /** Unique id for identifying this plugin */
  id: string,
  name: string,
  title: string,
  description: string,
}

/** Properties for aliases (e.g. !uptime) */
export interface CommandAlias {
  /** Points to an id of a command plugin */
  id: string,
  disabled?: boolean,
  cooldown?: number | {duration: number, uses: number},
  userCooldown?: number | {duration: number, uses: number},
  /*
  data.dynamic.channel.cooldowns.alias = {channel: [timesArray], user: {USER:[timesArray]}}
  */
}

export default class Commander {
  public commands: {[x: string]: Command}
  public controllers: {[x: string]: Controller}
  private defaults: {[x: string]: CommandAlias}
  private client: TwitchClient
  private data: Data

  constructor(client: TwitchClient, data: Data) {
    this.commands = {}
    this.controllers = {}
    this.defaults = {}
    this.client = client
    this.data = data
    this.client.on('message', this.onPrivMessage.bind(this))
  }

  public init(): Promise<{loaded: string[], failed: string[]}> {
    this.data.autoLoad('static', 'aliases', {})
    this.data.autoLoad('dynamic', 'cooldowns', {})
    this.data.load('dynamic', 'global', 'cooldowns', {})
    return new Promise((resolve, reject) => {
      readDirRecursive('./main/commands/', (err, files) => {
        if (err) return reject(err)
        if (!files || !files.length) return resolve({loaded: [], failed: []})
        const loaded: string[] = []
        const failed: string[] = []
        files.forEach((file) => {
          const plugin: {options: Command | Controller} = require(file)
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

  public createAlias(channel: string, alias: string, options: CommandAlias): boolean {
    if (!(this.data.static[channel] || {}).aliases) return false
    this.data.static[channel].aliases[alias] = options; return true
  }
  public deleteAlias(channel: string, alias: string) {
    if (!(this.data.static[channel] || {}).aliases) return false
    delete this.data.static[channel].aliases[alias]; return true
  }
  public enableAlias(channel: string, alias: string) {
    if (!((this.data.static[channel] || {}).aliases || {})[alias]) return false
    this.data.static[channel].aliases[alias].disabled = undefined; return true
  }
  public disableAlias(channel: string, alias: string) {
    if (!((this.data.static[channel] || {}).aliases || {})[alias]) return false
    this.data.static[channel].aliases[alias].disabled = true; return true
  }

  private onPrivMessage(raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) {
    const words = message.split(' ')
    if (!this.data.static[channel].aliases) return
    if (this.data.static[channel].aliases[words[0]]) {
      this.callCommand(this.data.static[channel].aliases[words[0]], raw, channel, userstate, message, me)
    } else if (this.defaults[words[0]]) this.callCommand(this.defaults[words[0]], raw, channel, userstate, message, me)
  }

  private async callCommand(command: CommandAlias, raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) {
    const res = await this.commands[command.id].actions.call(raw, channel, userstate, message, me)
    if (typeof res === 'string') this.client.msg(channel, res)
  }
}
