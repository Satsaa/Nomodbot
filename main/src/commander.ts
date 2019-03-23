import * as path from 'path'
import Data from './Data'
import TwitchClient from './lib/Client'
import { IrcMessage } from './lib/parser'
import { readDirRecursive } from './lib/util'

export interface Command {
  type: 'command',
  default: {
    /** Default command alias (e.g. !command) */
    alias: string,
    options: Pick<CommandAlias, Exclude<keyof CommandAlias, 'id'>>,
  }
  /** Usage instructions */
  help: string,
  actions: {
    /** When a command is succesfully called */
    call: (raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) => Promise<string | undefined>,
    /** When a command is called but is ignored due to a cooldown */
    cooldown?: (raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) => void,
  }
}

/** Controls a data type or something like that */
export interface Controller {
  type: 'controller',
}

export type Plugin = (Command | Controller) & {
  type: string,
  /** Unique id for identifying this plugin */
  id: string,
  name: string,
  description: string,
  /** Command is not enabled before these data types are loaded. [type,subType,name] */
  require?: Array<['static' | 'dynamic', string, string]>,
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
  public plugins: {commands: {[x: string]: Command}, controllers: {[x: string]: Controller}}
  private defaults: {[x: string]: CommandAlias}
  private client: TwitchClient
  private data: Data

  constructor(client: TwitchClient, data: Data) {
    this.plugins = {commands: {}, controllers: {}}
    this.defaults = {}
    this.client = client
    this.data = data
    this.client.on('message', this.onPrivMessage.bind(this))
  }

  public async init(): Promise<Plugin[]> {
    this.data.autoLoad('static', 'aliases', {})
    this.data.autoLoad('dynamic', 'cooldowns', {})
    this.data.load('dynamic', 'global', 'cooldowns', {})
    const files = await readDirRecursive('./main/commands/')
    if (!files || !files.length) return []
    return Promise.all(files.map((file) => {
      return this.loadPlugin(file)
    }))
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

  private async loadPlugin(file: string) {
    const plugin: {options: Plugin} = require(file)
    if (plugin.options) {
      if (plugin.options.require) {
        await Promise.all(plugin.options.require.map((v) => { this.data.waitData(...v) }))
        return this.handleOptions(plugin.options)
      } else return this.handleOptions(plugin.options)
    } else throw console.error('Plugin lacks options export')
  }
  /** Helper function for loadPlugin */
  private handleOptions(options: Plugin) {
    if (options.type === 'command') {
      this.plugins.commands[options.id] = options
      this.defaults[options.default.alias] = {...options.default.options, id: options.id}
    } else if (options.type === 'controller') this.plugins.controllers[options.id] = options
    return (options)
  }

  private onPrivMessage(raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) {
    const words = message.split(' ')
    if ((this.data.static[channel].aliases || {})[words[0]]) {
      this.callCommand(this.data.static[channel].aliases[words[0]], raw, channel, userstate, message, me)
    } else if (this.defaults[words[0]]) this.callCommand(this.defaults[words[0]], raw, channel, userstate, message, me)
  }

  private async callCommand(command: CommandAlias, raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) {
    const res = await this.plugins.commands[command.id].actions.call(raw, channel, userstate, message, me)
    if (typeof res === 'string') this.client.msg(channel, res)
  }
}
