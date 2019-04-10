import * as path from 'path'
import TwitchClient from './client/Client'
import { IrcMessage } from './client/parser'
import Data from './Data'
import { readDirRecursive } from './lib/util'
import PluginLibrary from './pluginLib'

interface Command {
  type: 'command',
  default: {
    /** Default command alias(es) (e.g. !command) */
    alias: string | string[],
    options: Pick<CommandAlias, Exclude<keyof CommandAlias, 'id'>>,
  }
  /** Usage instructions */
  help: Array<string | ((message: string) => string)>,
}

/** Controls a data type or something like that */
interface Controller {
  type: 'controller',
}

export type PluginOptions = (Command | Controller) & {
  type: string,
  /** Unique id for identifying this plugin */
  id: string
  name: string
  description: string
  /**
   * Signal that this plugin creates these data types  
   * subtype, name = normal data  
   * name = channel data  
   */
  creates?: Array<[string, string] | [string]>
  /** Plugin is instantiated after these data types are loaded */
  requires?: Array<[string, string, number?]>
  /** Plugin is instantiated after these plugins are loaded */
  requiresPlugins?: string[]
}

/** Properties for aliases (e.g. !uptime) */
export interface CommandAlias {
  /** The id of a command plugin */
  id: string
  disabled?: boolean
  /** 
   * Controls who can use this command. Either an array of permitted badge names or a number.  
   * Number: 0: everyone, 1: subscriber, 2: moderator, 3: broadcaster, 10: master
   * Some badges: prime, admin, bits, broadcaster, global_mod, moderator, subscriber, staff, turbo
   */
  permissions?: string[] | number,
  /** Cooldowns are in seconds */
  cooldown?: number | {duration?: number, delay?: number, limit?: number}
  /** Cooldowns are in seconds */
  userCooldown?: number | {duration?: number, delay?: number, limit?: number}
  /** Marks the alias as hidden. Plugins can then do specific handling based on the visibility (e.g. hidden commands are not shown with !commands) */
  hidden?: boolean
}

export interface PluginInstance {
  /** Execute before enabling this plugin */
  init?: () => Promise<void>
  /** An alias of this command is called */
  call?: (channel: string, user: string, userstate: IrcMessage['tags'], message: string, params: string[], me: boolean) => Promise<string | void>,
  /** An alias of this command is called but it was on cooldown */
  cooldown?: (channel: string, user: string, userstate: IrcMessage['tags'], message: string, params: string[], me: boolean) => void,
}

export default class Commander {
  public defaults: {[alias: string]: CommandAlias}
  public plugins: {[pluginId: string]: PluginOptions}
  public instances: {[pluginId: string]: PluginInstance}
  private client: TwitchClient
  private data: Data
  private waits: {[pluginId: string]: Array<(result: boolean) => any>}
  private pluginLib: PluginLibrary
  private masters: string[]

  constructor(client: TwitchClient, data: Data, masters: string[]) {
    this.defaults = {}
    this.plugins = {}
    this.instances = {}
    this.masters = masters
    this.client = client
    this.data = data
    this.waits = {}
    this.pluginLib = new PluginLibrary(client, data, this)
    this.client.on('chat', this.onPrivMessage.bind(this))
  }

  public async init(): Promise<PluginOptions[]> {
    this.data.autoLoad('aliases', {})
    this.data.autoLoad('cooldowns', {})
    const files = (await readDirRecursive(path.join(__dirname, '..', 'commands')))
      .filter(f => (f.endsWith('.ts') || f.endsWith('.js') && !f.includes('tempCodeRunnerFile')))
    if (!files || !files.length) return []
    const optionsArr = files.map(file => this.handleOptions(file))
    this.findConflicts(optionsArr, files)
    return optionsArr
  }

  /** Check for duplicate data type creations and if a plugin requires data that no present plugin creates */
  public findConflicts(optionsArray: PluginOptions[], files: string[]) {
    const messages: string[] = [] // Error messages
    const created: string[] = [] // Created data types
    const names: string[] = [] // Corresponding plugin name for created entries
    const ids: string[] = [] // Ids of plugin options
    optionsArray.forEach((c, i) => { // Fill ids
      if (ids.includes(c.id)) messages.push(`${c.id} id is duplicated in ${path.basename(files[i])} and ${path.basename(files[ids.indexOf(c.id)])}`)
      ids.push(c.id)
    })
    optionsArray.forEach((c) => { // Check for id duplicates
      if (c.creates) {
        c.creates.forEach((e) => {
          if (created.includes(makePath(e))) {
            messages.push(`${c.name} duplicates ${makePath(e)} from ${names[created.indexOf(makePath(e))]}`)
          }
          names.push(c.name)
          created.push(makePath(e))
        })
      }
    })
    optionsArray.forEach((r) => { // Check for absent required data
      if (r.requires) {
        r.requires.forEach((e) => {
          if (created.indexOf(makePath(e)) === -1) {
            messages.push(`${r.name} requires ${makePath(e)}`)
          }
        })
      }
    })
    optionsArray.forEach((c) => { // Check for self requirement
      if (c.creates) {
        c.creates.forEach((cr) => {
          if (c.requires) {
            c.requires.forEach((re) => {
              if (makePath(cr) === makePath(re)) messages.push(`${c.id} requires data that it creates`)
            })
          }
        })
      }
    })
    if (messages.length) throw new Error(messages.join('. '))

    function makePath(source: [string, (string | number)?, number?]) {
      const pathOnly = source.filter(v => typeof v === 'string')
      if (pathOnly.length === 2) return `${pathOnly[0]}\\${pathOnly[1]}`
      return `#CHANNEL\\${pathOnly[0]}`
    }
  }

  public createAlias(channel: string, alias: string, options: CommandAlias): boolean {
    if (!(this.data.data[channel] || {}).aliases) return false
    this.data.data[channel].aliases[alias] = {...options}; return true
  }
  public deleteAlias(channel: string, alias: string) {
    if (!(this.data.data[channel] || {}).aliases) return false
    delete this.data.data[channel].aliases[alias]; return true
  }
  public enableAlias(channel: string, alias: string) {
    if (!((this.data.data[channel] || {}).aliases || {})[alias]) return false
    delete this.data.data[channel].aliases[alias].disabled; return true
  }
  public disableAlias(channel: string, alias: string) {
    if (!((this.data.data[channel] || {}).aliases || {})[alias]) return false
    this.data.data[channel].aliases[alias].disabled = true; return true
  }

  public getAlias(channel: string, alias: string): CommandAlias | void {
    if (((this.data.data[channel] || {}).aliases || {})[alias]) {
      return this.data.data[channel].aliases[alias]
    } else if (this.defaults[alias]) return this.defaults[alias]
  }
  public getActiveAlias(channel: string, alias: string): CommandAlias | void {
    if (((this.data.data[channel] || {}).aliases || {})[alias] && !this.data.data[channel].aliases[alias].disabled) {
      return this.data.data[channel].aliases[alias]
    } else if (this.defaults[alias] && !this.defaults[alias].disabled) return this.defaults[alias]
  }

  /** Determine if a user with `badges` would be permitted to call this command */
  public isPermitted(permissions: string[] | number, badges: IrcMessage['tags']['badges'] /*  { [badge: string]: number } */, user: string) {
    // Number: 0: everyone, 1: subscriber, 2: moderator, 3: broadcaster, 10: master
    if (badges === undefined) return
    if (this.masters.includes(user)) return true
    if (typeof permissions === 'number') {
      switch (permissions) {
        case 0:
          return true
        case 1:
          if (badges.subscriber) return true
        case 2:
          if (badges.moderator) return true
        case 3:
          if (badges.broadcaster) return true
        case 10:
          break
        default:
          console.warn(`Unknown permission level: ${permissions}`)
          return true
      }
    } else {
      for (const badge in badges) {
        if (permissions.includes(badge)) return true
      }
    }
    return false
  }

  /** Resolves with true when plugin is loaded or with false on timeout */
  public waitPlugin(pluginId: string, timeout?: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.instances[pluginId]) return resolve(true)
      if (!this.waits[pluginId]) this.waits[pluginId] = [resolve]
      else this.waits[pluginId].push(resolve)
      if (timeout !== undefined) {
        setTimeout(resolve, timeout, false)
      }
    })
  }
  /** Resolves waitPlugin promises */
  private resolveWaits(pluginId: string): boolean {
    if (!this.waits[pluginId] || !this.waits[pluginId].length) return false
    this.waits[pluginId].forEach(resolveWait => resolveWait(true))
    this.waits[pluginId] = []
    return true
  }

  private handleOptions(file: string) {
    const plugin: {options: PluginOptions, Instance: new() => PluginInstance} = require(file)
    const options = plugin.options
    if (options) {
      const type = options.type // Cant use options in default case
      this.plugins[options.id] = options
      switch (options.type) {
        case 'command':
          if (Array.isArray(options.default.alias)) {
            options.default.alias.forEach((alias) => {
              this.defaults[alias] = {...options.default.options, id: options.id}
            })
          } else {
            this.defaults[options.default.alias] = {...options.default.options, id: options.id}
          }
          break
        case 'controller':
          break
        default:
          throw new Error('Unknown plugin type: ' + type)
      }
      this.instantiatePlugin(options, plugin.Instance) // Maybe this should be awaited?
      return options
    } else throw console.error('Plugin lacks options export: ' + file)
  }

  private async instantiatePlugin(options: PluginOptions, instantiator: new(pluginLib: PluginLibrary) => PluginInstance) {
    // console.log(`Instantiating ${options.id}`)
    let res: Array<object | undefined> = []
    // Wait for requirements. Do not wait for channel data requirements
    if (options.requires && options.requires.map(v => typeof v === 'string').length === 3) {
      res = await Promise.all(options.requires.map(v => this.data.waitData(v[0], v[1], v[2] || 3000)))
      if (res.some(v => v === undefined)) { // A wait promise timedout
        console.log(`${options.id} instantiation still waiting for data.`)
        await Promise.all(options.requires.map(v => this.data.waitData(v[0], v[1])))
      }
    }
    if (options.requiresPlugins) await Promise.all(options.requiresPlugins.map(id => this.waitPlugin(id)))
    const instance = new instantiator(this.pluginLib)
    if (typeof instance.init === 'function') await instance.init()
    // console.log(`Instantiated ${options.id}`)
    this.instances[options.id] = instance
    this.resolveWaits(options.id)
    if (options.type === 'command' && typeof this.instances[options.id].call !== 'function') {
      throw new Error(`Invalid call function on command plugin instance: ${this.plugins[options.id].id}`)
    }
  }

  private onPrivMessage(channel: string, user: string, userstate: IrcMessage['tags'], message: string, me: boolean, self: boolean) {
    if (self) return
    const words = message.split(' ')
    const alias = this.getActiveAlias(channel, words[0])
    if (alias) this.callCommand(channel, user, alias, userstate, message, me)
  }

  private async callCommand(channel: string, user: string, alias: CommandAlias, userstate: IrcMessage['tags'], message: string, me: boolean) {
    // !!! Implement the ban API
    const instance = this.instances[alias.id]
    if (!instance) return console.log(`Cannot call unloaded command: ${alias.id}`) // Command may not be loaded yet
    if (typeof instance.call !== 'function') throw new Error(`Invalid call function on command plugin instance: ${alias.id}`)
    if (alias.permissions === undefined || this.isPermitted(alias.permissions, userstate.badges, user)) {
      if (!this.masters.includes(user) && this.isOnCooldown(channel, user, alias)) {
        if (typeof instance.cooldown === 'function') instance.cooldown(channel, user, userstate, message, message.split(' '), me)
        return
      }
      const res = await instance.call(channel, user, userstate, message, message.split(' '), me)
      if (res) this.client.chat(channel, res)
    }
  }

  /** Determine if command is on cooldown. Assumes a message is sent if returns false */
  private isOnCooldown(channel: string, user: string, alias: CommandAlias) {
    const cooldowns = this.data.getData(channel, 'cooldowns')
    if (!cooldowns) return false
    // !!! Implement the permit API
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
      const duration = opts.duration! * 1000

      // Remove times older than duration
      for (let i = 0; i < times.length; i++) {
        if (times[i] < now - duration) { // time is expired
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
        const limitTest = (times[exceeds + 0] + duration) - now // test all but delay
        return Math.max(delayTest, limitTest)
      }
    }
  }
}
