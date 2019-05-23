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
    options: Pick<CommandAlias, Exclude<keyof CommandAlias, 'target'>>,
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
  /** Unique name for identifying this plugin */
  name: string
  title: string
  description: string
  /**
   * Signal that this plugin creates these data types  
   * subtype, name = normal data  
   * name = channel data  
   */
  creates?: Array<[string, string] | [string]>
  /** Plugin is instantiated after these data types are loaded */
  requireDatas?: Array<[string, string, number?]>
  /** Plugin is instantiated after these plugins are loaded */
  requirePlugins?: string[]
  /**
   * Whether or not this plugin can be unloaded safely  
   * The `PluginInstance.unload` function can be used for cleanup actions
   */
  unloadable?: true
}

/** Properties for aliases */
export interface CommandAlias {
  /** The unique name of a command plugin */
  target: string
  disabled?: true
  /** 
   * Controls who can use this command. Either an array of permitted badge names or a number.  
   * Number: 0: everyone, 1: subscriber, 2: moderator, 3: broadcaster, 10: master
   * Some badges: prime, admin, bits, broadcaster, global_mod, moderator, subscriber, staff, turbo
   */
  permissions?: string[] | number,
  /** Cooldowns are in seconds. This can either be a number or ratelimiter options object */
  cooldown?: number | {duration?: number, delay?: number, limit?: number}
  /** Cooldowns are in seconds. This can either be a number or ratelimiter options object */
  userCooldown?: number | {duration?: number, delay?: number, limit?: number}
  /** Marks the alias as hidden (e.g. hidden commands are not shown with !commands) */
  hidden?: true
  /** Whether or not this alias is an immutable default alias created by a plugin */
  default?: true
  /** Custom data that the command plugin can handle */
  data?: any
}

export interface PluginInstance {
  /** Execute before enabling this plugin */
  init?: () => Promise<void>
  /** An alias of this command is called */
  call?: (channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) => Promise<string | void>,
  /** An alias of this command is called but it was on cooldown */
  cooldown?: (channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) => void,
  /** This plugin is being unloaded (this function is not called when the bot is shutting down) */
  unload?: () => void
}

export default class Commander {
  public defaults: {[alias: string]: CommandAlias}
  public plugins: {[pluginId: string]: PluginOptions}
  public instances: {[pluginId: string]: PluginInstance}
  private client: TwitchClient
  private data: Data
  private waits: {[pluginId: string]: Array<(result: boolean) => any>}
  private pluginLib: PluginLibrary
  private masters: number[]

  constructor(client: TwitchClient, data: Data, masters: number[]) {
    this.defaults = {}
    this.plugins = {}
    this.instances = {}
    this.masters = masters
    this.client = client
    this.data = data
    this.waits = {}
    this.pluginLib = new PluginLibrary(client, data, this)
    this.client.on('chat', this.onChat.bind(this))
  }

  public async init(): Promise<PluginOptions[]> {
    this.data.autoLoad('aliases', {})
    this.data.autoLoad('cooldowns', {user: {}, shared: {} as CooldownData}, true)
    const files = (await readDirRecursive(path.join(__dirname, '..', 'commands')))
      .filter(f => (f.endsWith('.ts') || f.endsWith('.js') && !f.includes('tempCodeRunnerFile')))
    if (!files || !files.length) return []
    const optionsArr = files.map(file => this.handleFile(file))
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
      if (ids.includes(c.name)) messages.push(`${c.name} id is duplicated in ${path.basename(files[i])} and ${path.basename(files[ids.indexOf(c.name)])}`)
      ids.push(c.name)
    })
    optionsArray.forEach((c) => { // Check for id duplicates
      if (c.creates) {
        c.creates.forEach((e) => {
          if (created.includes(makePath(e))) {
            messages.push(`${c.title} duplicates ${makePath(e)} from ${names[created.indexOf(makePath(e))]}`)
          }
          names.push(c.title)
          created.push(makePath(e))
        })
      }
    })
    optionsArray.forEach((r) => { // Check for required data that is not loaded by any command
      if (r.requireDatas) {
        r.requireDatas.forEach((e) => {
          if (created.indexOf(makePath(e)) === -1) {
            messages.push(`${r.title} requires ${makePath(e)}`)
          }
        })
      }
    })
    optionsArray.forEach((c) => { // Check for self requirement
      if (c.creates) {
        c.creates.forEach((cr) => {
          if (c.requireDatas) {
            c.requireDatas.forEach((re) => {
              if (makePath(cr) === makePath(re)) messages.push(`${c.name} requires data that it creates`)
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

  public createAlias(channelId: number, alias: string, options: CommandAlias): boolean {
    if (!(this.data.data[channelId] || {}).aliases) return false
    this.data.data[channelId].aliases[alias] = {...options}; return true
  }
  public deleteAlias(channelId: number, alias: string) {
    if (!(this.data.data[channelId] || {}).aliases) return false
    delete this.data.data[channelId].aliases[alias]; return true
  }
  public enableAlias(channelId: number, alias: string) {
    if (!((this.data.data[channelId] || {}).aliases || {})[alias]) return false
    delete this.data.data[channelId].aliases[alias].disabled; return true
  }
  public disableAlias(channelId: number, alias: string) {
    if (!((this.data.data[channelId] || {}).aliases || {})[alias]) return false
    this.data.data[channelId].aliases[alias].disabled = true; return true
  }

  public getAlias(channelId: number, alias: string): CommandAlias | void {
    if (((this.data.data[channelId] || {}).aliases || {})[alias]) {
      return this.data.data[channelId].aliases[alias]
    } else if (this.defaults[alias]) return this.defaults[alias]
  }
  public getActiveAlias(channelId: number, alias: string): CommandAlias | void {
    if (((this.data.data[channelId] || {}).aliases || {})[alias] && !this.data.data[channelId].aliases[alias].disabled) {
      return this.data.data[channelId].aliases[alias]
    } else if (this.defaults[alias] && !this.defaults[alias].disabled) return this.defaults[alias]
  }
  public getAliasesById(channelId: number, commandId: string) {
    const results: CommandAlias[] = []
    if ((this.data.data[channelId] || {}).aliases) {
      const aliases = this.data.data[channelId].aliases as {[alias: string]: CommandAlias}
      for (const alias in aliases) {
        if (aliases[alias].target === commandId) results.push(aliases[alias])
      }
    }
    for (const alias in this.defaults) {
      if (this.defaults[alias].target === commandId) results.push(this.defaults[alias])
    }
    return results
  }
  public getActiveAliasesById(channelId: number, commandId: string) {
    const results: CommandAlias[] = []
    if ((this.data.data[channelId] || {}).aliases) {
      const aliases = this.data.data[channelId].aliases as {[alias: string]: CommandAlias}
      for (const alias in aliases) {
        if (!this.defaults[alias].disabled && aliases[alias].target === commandId) results.push(aliases[alias])
      }
    }
    for (const alias in this.defaults) {
      if (!this.defaults[alias].disabled && this.defaults[alias].target === commandId) results.push(this.defaults[alias])
    }
    return results
  }

  /** Determine if a user with `badges` would be permitted to call this command */
  public isPermitted(permissions: string[] | number, badges: IrcMessage['tags']['badges'] /*  { [badge: string]: number } */, userId: number) {
    // Number: 0: everyone, 1: subscriber, 2: moderator, 3: broadcaster, 10: master
    // !!! Implement the permit API
    // !!! Implement the ban API
    if (badges === undefined) return
    if (this.masters.includes(userId)) return true
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
  public waitPlugin(pluginId: string/* , timeout?: number */): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.instances[pluginId]) return resolve(true)
      if (!this.waits[pluginId]) this.waits[pluginId] = [resolve]
      else this.waits[pluginId].push(resolve)
      // if (timeout !== undefined) {
      //   setTimeout(resolve, timeout, false)
      // }
    })
  }
  /** Resolves waitPlugin promises */
  private resolveWaits(pluginId: string): boolean {
    if (!this.waits[pluginId] || !this.waits[pluginId].length) return false
    this.waits[pluginId].forEach(resolveWait => resolveWait(true))
    this.waits[pluginId] = []
    return true
  }

  private handleFile(file: string) {
    const plugin: {options: PluginOptions, Instance: new() => PluginInstance} = require(file)
    const options = plugin.options
    if (options) {
      const type = options.type // Cant use options in default case
      this.plugins[options.name] = options
      switch (options.type) {
        case 'command':
          if (Array.isArray(options.default.alias)) {
            options.default.alias.forEach((alias) => {
              this.defaults[alias] = {...options.default.options, target: options.name}
            })
          } else {
            this.defaults[options.default.alias] = {...options.default.options, target: options.name}
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
    if (options.requireDatas && options.requireDatas.map(v => typeof v === 'string').length === 3) {
      res = await Promise.all(options.requireDatas.map(v => this.data.waitData(v[0], v[1], v[2] || 3000)))
      if (res.some(v => v === undefined)) { // A wait promise timedout
        console.log(`${options.name} instantiation still waiting for data.`)
        await Promise.all(options.requireDatas.map(v => this.data.waitData(v[0], v[1])))
      }
    }
    if (options.requirePlugins) await Promise.all(options.requirePlugins.map(id => this.waitPlugin(id)))
    const instance = new instantiator(this.pluginLib)
    if (typeof instance.init === 'function') await instance.init()
    // console.log(`Instantiated ${options.id}`)
    this.instances[options.name] = instance
    this.resolveWaits(options.name)
    if (options.type === 'command' && typeof this.instances[options.name].call !== 'function') {
      throw new Error(`Invalid call function on command plugin instance: ${this.plugins[options.name].name}`)
    }
  }

  private async onChat(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, me: boolean, self: boolean) {
    if (self) return
    const words = message.split(' ')
    const alias = this.getActiveAlias(channelId, words[0].toLowerCase())
    if (!alias) return
    const instance = this.instances[alias.target]
    if (!instance) return console.log(`Cannot call unloaded command: ${alias.target}`) // Command may not be loaded yet
    if (typeof instance.call !== 'function') throw new Error(`Invalid call function on command plugin instance: ${alias.target}`)
    if (alias.permissions === undefined || this.isPermitted(alias.permissions, userstate.badges, userId)) {
      if (!this.masters.includes(userId) && this.isOnCooldown(channelId, userId, alias)) {
        if (typeof instance.cooldown === 'function') instance.cooldown(channelId, userId, userstate, message, words, me)
        return
      }
      const res = await instance.call(channelId, userId, userstate, message, words, me)
      if (res) this.client.chat(channelId, res)
    }
  }

  /** Determine if command is on cooldown. Assumes a message is sent if returns false */
  private isOnCooldown(channelId: number, userId: number, alias: CommandAlias) {
    const cooldowns = this.data.getData(channelId, 'cooldowns') as CooldownData
    if (!cooldowns) return false
    let res1 = 0
    let res2 = 0
    const now = Date.now()
    if (alias.cooldown) {
      if (typeof cooldowns.shared[alias.target] !== 'object') cooldowns.shared[alias.target] = []
      res1 = next(cooldowns.shared[alias.target], alias.cooldown)
    }
    if (alias.userCooldown) {
      if (typeof cooldowns.user[alias.target] !== 'object') cooldowns.user[alias.target] = {}
      if (typeof cooldowns.user[alias.target][userId] !== 'object') cooldowns.user[alias.target][userId] = []
      res2 = next(cooldowns.user[alias.target][userId], alias.userCooldown)
    }
    if (Math.max(res1, res2) <= 0) {
      if (alias.cooldown) cooldowns.shared[alias.target].push(now)
      if (alias.userCooldown) cooldowns.user[alias.target][userId].push(now)
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

interface CooldownData {
  user: { [commandId: string]: { [userId: number]: number[] } }
  shared: { [commandId: string]: number[] }
}
