import * as path from 'path'
import Data from './Data'
import TwitchClient from './lib/Client'
import { IrcMessage } from './lib/parser'
import { readDirRecursive } from './lib/util'
import PluginLibrary from './pluginLib'

export interface Command {
  type: 'command',
  default: {
    /** Default command alias (e.g. !command) */
    alias: string,
    options: Pick<CommandAlias, Exclude<keyof CommandAlias, 'id'>>,
  }
  /** Usage instructions */
  help: string,
}

/** Controls a data type or something like that */
export interface Controller {
  type: 'controller',
}

export type PluginOptions = (Command | Controller) & {
  type: string,
  /** Unique id for identifying this plugin */
  id: string,
  name: string,
  description: string,
  /** Signal that this plugin creates these data types */
  creates?: Array<['static' | 'dynamic' | 'config', string, string]>,
  /** Plugin is not enabled before these data types are loaded. [type,subType,name] */
  requires?: Array<['static' | 'dynamic' | 'config', string, string, number?]>,
}

/** Properties for aliases (e.g. !uptime) */
export interface CommandAlias {
  /** The id of a command plugin */
  id: string,
  disabled?: boolean,
  cooldown?: number | {duration?: number, delay?: number, limit?: number},
  userCooldown?: number | {duration?: number, delay?: number, limit?: number},
}

export interface PluginInstance {
  // * Execute before enabling this plugin */
  init?: () => Promise<void>
  // * An alias of this command is called */
  call?: (channel: string, userstate: object, message: string, me: boolean) => Promise<string | null>,
  // * An alias of this command is called but it was on cooldown */
  cooldown?: (channel: string, userstate: object, message: string, me: boolean) => void,
}

export default class Commander {
  public defaults: {[x: string]: CommandAlias}
  public plugins: {[x: string]: PluginOptions}
  public instances: {[x: string]: PluginInstance}
  private client: TwitchClient
  private data: Data
  private pluginLib: PluginLibrary

  constructor(client: TwitchClient, data: Data) {
    this.defaults = {}
    this.plugins = {}
    this.instances = {}
    this.client = client
    this.data = data
    this.pluginLib = new PluginLibrary(client, data, this)
    this.client.on('chat', this.onPrivMessage.bind(this))
  }

  public async init(): Promise<PluginOptions[]> {
    this.data.autoLoad('static', 'aliases', {})
    this.data.autoLoad('dynamic', 'cooldowns', {})
    this.data.load('dynamic', 'global', 'cooldowns', {})
    const files = (await readDirRecursive(path.join(__dirname, '..', 'commands'))).filter(e => e.endsWith('.ts') || e.endsWith('.js'))
    if (!files || !files.length) return []
    const optionsArr = files.map(file => this.loadPlugin(file))
    this.findConflicts(optionsArr)
    return optionsArr
  }

  /** Check for duplicate data type creations and if a plugin requires data that no present plugin creates */
  public findConflicts(optionsArray: PluginOptions[]) {
    const messages: string[] = []
    const created: string[] = []
    const names: string[] = [] // Corresponding plugin name for created entries
    optionsArray.forEach((c) => {
      if (c.creates) {
        c.creates.forEach((e) => {
          if (created.includes(`${e[0]}\\${e[1]}\\${e[2]}`)) {
            messages.push(`${c.name} duplicates ${e[0]}\\${e[1]}\\${e[2]} from ${names[created.indexOf(`${e[0]}\\${e[1]}\\${e[2]}`)]}`)
          }
          names.push(c.name)
          created.push(`${e[0]}\\${e[1]}\\${e[2]}`)
        })
      }
    })
    optionsArray.forEach((r) => {
      if (r.requires) {
        r.requires.forEach((e) => {
          if (created.indexOf(`${e[0]}\\${e[1]}\\${e[2]}`) === -1) {
            messages.push(`${r.name} requires ${e[0]}\\${e[1]}\\${e[2]}`)
          }
        })
      }
    })
    if (messages.length) throw new Error(messages.join('/n'))
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

  public getActiveAlias(channel: string, word: string): CommandAlias | void {
    if (((this.data.static[channel] || {}).aliases || {})[word] && !this.data.static[channel].aliases[word].disabled) {
      return this.data.static[channel].aliases[word]
    } else if (this.defaults[word] && !this.defaults[word].disabled) return this.defaults[word]
  }

  private loadPlugin(file: string) {
    const plugin: {options: PluginOptions, Instance: new() => PluginInstance} = require(file)
    if (plugin.options) {
      return this.handlePlugin(plugin.options, plugin.Instance)
    } else throw console.error('Plugin lacks options export: ' + file)
  }
  /** Helper function for loadPlugin */
  private handlePlugin(options: PluginOptions, constructor: new() => PluginInstance) {
    const type = options.type // Cant use options in default case
    this.plugins[options.id] = options
    switch (options.type) {
      case 'command':
        this.defaults[options.default.alias] = {...options.default.options, id: options.id}
        break
      case 'controller':
        break
      default:
        throw new Error('Unknown plugin type: ' + type)
    }
    this.instantiatePlugin(options, constructor) // Maybe this should be awaited?
    return options
  }

  private async instantiatePlugin(options: PluginOptions, constructor: new() => PluginInstance) {
    console.log(`Instantiating ${options.name}`)
    let res: Array<object | undefined> = []
    if (options.requires) {
      res = await Promise.all(options.requires.map(v => this.data.waitData(v[0], v[1], v[2], v[3] || 3000)))
      if (res.some(v => v === undefined)) {
        console.log(`${options.name} instantiation still waiting for data.`)
        await Promise.all(options.requires.map(v => this.data.waitData(v[0], v[1], v[2])))
      }
    }
    const instance = new constructor()
    if (typeof instance.init === 'function') await instance.init()
    console.log(`Instantiated ${options.name}`)
    this.instances[options.id] = instance
    if (typeof this.instances[options.id].call !== 'function') {
      throw new Error(`Invalid call function on command plugin instance: ${this.plugins[options.id].name}`)
    }
  }

  private onPrivMessage(channel: string, user: string, userstate: object, message: string, me: boolean) {
    const words = message.split(' ')
    const alias = this.getActiveAlias(channel, words[0])
    if (alias) this.callCommand(channel, user, alias, userstate, message, me)
  }

  private async callCommand(channel: string, user: string, alias: CommandAlias, userstate: object, message: string, me: boolean) {
    if (!this.instances[alias.id]) return console.log(`Cannot call unloaded command: ${alias.id}`) // Command may not be loaded yet
    if (typeof this.instances[alias.id].call !== 'function') throw new Error(`Invalid call function on command plugin instance: ${alias.id}`)
    if (this.isOnCooldown(channel, user, alias)) {
      if (typeof this.instances[alias.id].cooldown === 'function') this.instances[alias.id].cooldown!(channel, userstate, message, me)
      return
    }
    const res = await this.instances[alias.id].call!(channel, userstate, message, me)
    if (typeof res === 'string') this.client.chat(channel, res)
  }

  /** Determine if command is on cooldown. Assumes a message is sent if returns false */
  private isOnCooldown(channel: string, user: string, alias: CommandAlias) {
    const cooldowns = this.data.getData('dynamic', channel, 'cooldowns')
    if (!cooldowns) return false
    let res1 = 0
    let res2 = 0
    const now = Date.now()
    if (alias.cooldown) {
      if (typeof cooldowns[alias.id] !== 'object') cooldowns[alias.id] = [] // Array is object
      res1 = next(cooldowns[alias.id], alias.cooldown)
    }
    if (alias.userCooldown) {
      if (typeof cooldowns._user !== 'object') cooldowns._user = {}
      if (typeof cooldowns._user[alias.id] !== 'object') cooldowns._user[alias.id] = {}
      if (typeof cooldowns._user[alias.id][user] !== 'object') cooldowns._user[alias.id][user] = []
      res2 = next(cooldowns._user[alias.id][user], alias.userCooldown)
    }
    if (Math.max(res1, res2) <= 0) {
      if (alias.cooldown) cooldowns[alias.id].push(now)
      if (alias.userCooldown) cooldowns._user[alias.id][user].push(now)
      return false
    }
    return true

    function next(times: number[], opts: number | {duration?: number, delay?: number, limit?: number}) {
      if (typeof opts === 'number') opts = {duration: opts, delay: 0, limit: 1}
      else {
        if (typeof opts.delay === 'undefined') opts.delay =  0
        if (typeof opts.duration === 'undefined') opts.duration =  30000
        if (typeof opts.limit === 'undefined') opts.limit =  1
      }
      // Remove times older than duration
      for (let i = 0; i < times.length; i++) {
        if (times[i] < now - opts.duration!) { // time is expired
          times.shift()
          i--
        } else break
      }
      // Calculate next time
      if (times.length < opts.limit!) { // Limit is not reached calculate needed wait for delay
        return times.length ? (times[times.length - 1] + opts.delay!) - now : 0
      } else {
        const exceeds = times.length - opts.limit!
        const delayTest = (times[times.length - 1] + opts.delay!) - now // test only for delay
        const limitTest = (times[exceeds + 0] + opts.duration!) - now // test all but delay
        return Math.max(delayTest, limitTest)
      }
    }
  }
}
