import * as path from 'path'
import TwitchClient from './client/Client'
import { IrcMessage, PRIVMSG } from './client/parser'
import Data from './Data'
import * as util from './lib/util'
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
  /** Unique id for identifying this plugin (lower case) */
  id: string
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
   * Whether or not this plugin cannot be unloaded safely  
   * The `PluginInstance.unload` function can be used for cleanup actions  
   * Although data types in `creates` are unloaded automatically
   */
  noUnload?: true
}

/** Properties for aliases */
export interface CommandAlias {
  /** The unique iq of a command plugin */
  target: string
  disabled?: true
  /** 
   * Controls who can use this command. Either an array of permitted badge names or a number.  
   * Number: 0: everyone, 1: subscriber, 2: moderator, 3: broadcaster, 10: master
   * Some badges: moderator, subscriber, prime, admin, bits, broadcaster, global_mod, staff, turbo
   */
  permissions?: string[] | number,
  /** Cooldowns are in seconds. This can either be a number or ratelimiter options object */
  cooldown?: number | {duration?: number, delay?: number, limit?: number}
  /** Cooldowns are in seconds. This can either be a number or ratelimiter options object */
  userCooldown?: number | {duration?: number, delay?: number, limit?: number}
  /** Marks the alias as hidden (e.g. hidden commands are not shown with !commands) */
  hidden?: true
  /** Custom data that the command plugin can handle */
  data?: any
  /** List of user ids that can use this alias without checking permissions */
  whitelist?: number[]
  /** List of user ids that may not use this alias at all */
  blacklist?: number[]
}

/** isPermitted helper type */
interface AliasLike {
  permissions: string[] | number,
  whitelist?: number[],
  blacklist?: number[]
}

export interface Extra {
  /** Used alias */
  alias: Readonly<CommandAlias>,
  /** Full* chat message *Action headers are not included */
  message: string,
  /** Message was an action (/me) */
  me: boolean,
  /** Remaining cooldown when trying to trigger command */
  cooldown: number,
}

export interface PluginInstance {
  /** This plugin is being loaded, execute before enabling this plugin */
  init?: () => Promise<void>
  /** An alias of this command plugin is called */
  call?: (channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) => Promise<string | void>,
  /** An alias of this command is called but it was on cooldown */
  cooldown?: (channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) => void,
  /** This plugin is being unloaded (not when the bot is shutting down). Creates are unloaded automatically after this */
  unload?: () => Promise<void>
}

export default class Commander {
  public defaultAliases: {[alias: string]: CommandAlias}
  public paths: {[pluginId: string]: string}
  public plugins: {[pluginId: string]: PluginOptions}
  public instances: {[pluginId: string]: PluginInstance}
  private client: TwitchClient
  private data: Data
  private waits: {[pluginId: string]: Array<(result: boolean) => any>}
  private pluginLib: PluginLibrary
  /** Big bois with big privileges */
  private masters: number[]

  constructor(client: TwitchClient, data: Data, masters: number[]) {
    this.defaultAliases = {}
    this.paths = {}
    this.plugins = {}
    this.instances = {}
    this.masters = masters
    this.client = client
    this.data = data
    this.waits = {}
    this.pluginLib = new PluginLibrary(client, data, this)
    this.client.on('chat', this.onChat.bind(this))
  }

  /**
   * Loads all plugins in the plugin folder and it's subfolders  
   * @returns List of loaded plugin ids
   */
  public async init(): Promise<string[]> {
    this.data.autoLoad('aliases', {})
    this.data.autoLoad('cooldowns', {user: {}, shared: {} as CooldownData}, true)
    const files = (await readDirRecursive(path.join(__dirname, '..', 'plugins')))
      .filter(f => (f.endsWith('.ts') || f.endsWith('.js') && !f.includes('tempCodeRunnerFile')))
    const optionsArr = files.map(file => this.loadFromPath(file))
    this.findConflicts(optionsArr, files)
    await Promise.all(optionsArr)
    return optionsArr.map(v => v.id)
  }

  /** Check for duplicate data type creations and if a plugin requires data that no present plugin creates */
  public findConflicts(optionsArray: PluginOptions[], files: string[]) {
    const messages: string[] = [] // Error messages
    const created: string[] = [] // Created data types
    const titles: string[] = [] // Corresponding plugin title for created entries
    const ids: string[] = [] // Ids of plugins
    // Fill ids
    optionsArray.forEach((c, i) => {
      if (ids.includes(c.id)) {
        messages.push(`${c.id}'s id is duplicated in ${path.basename(files[i])} and ${path.basename(files[ids.indexOf(c.id)])}`)
      }
      ids.push(c.id)
    })
    // Check for id duplicates
    optionsArray.forEach((c) => {
      if (c.creates) {
        c.creates.forEach((e) => {
          if (created.includes(makePath(e))) {
            messages.push(`${c.title} duplicates ${makePath(e)} from ${titles[created.indexOf(makePath(e))]}`)
          }
          titles.push(c.title)
          created.push(makePath(e))
        })
      }
    })
    // Check for required data that is not loaded by any command
    optionsArray.forEach((r) => {
      if (r.requireDatas) {
        r.requireDatas.forEach((e) => {
          if (created.indexOf(makePath(e)) === -1) {
            messages.push(`${r.title} requires ${makePath(e)}`)
          }
        })
      }
    })
    // Check for self requirement
    optionsArray.forEach((c) => {
      if (c.creates) {
        c.creates.forEach((cr) => {
          if (c.requireDatas) {
            c.requireDatas.forEach((re) => {
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

  public createAlias(channelId: number, alias: string, options: CommandAlias): boolean {
    if (!(this.data.data[channelId] || {}).aliases) return false
    this.data.data[channelId].aliases[alias] = {...options}; return true
  }
  public deleteAlias(channelId: number, alias: string) {
    if (!(this.data.data[channelId] || {}).aliases) return false
    delete this.data.data[channelId].aliases[alias]; return true
  }

  public getAlias(channelId: number, alias: string): CommandAlias | void {
    if (((this.data.data[channelId] || {}).aliases || {})[alias]) {
      return this.data.data[channelId].aliases[alias]
    }
  }
  public getGlobalAlias(alias: string): Readonly<CommandAlias> | undefined {
    return this.defaultAliases[alias]
  }

  public getAliases(channelId: number): {[alias: string]: CommandAlias} | void {
    if ((this.data.data[channelId] || {}).aliases) {
      return this.data.data[channelId].aliases
    }
  }
  public getGlobalAliases(): {[alias: string]: Readonly<CommandAlias>} {
    return this.defaultAliases
  }

  /** Determine if `userId` with `badges` would be permitted to call this command */
  public isPermitted(alias: AliasLike, badges: IrcMessage['tags']['badges'], userId: number) {
    // Number: 0: everyone, 1: subscriber, 2: moderator, 3: broadcaster, 10: master
    if (alias.blacklist && alias.blacklist.includes(userId)) return false
    if (alias.whitelist && alias.whitelist.includes(userId)) return true
    if (this.masters.includes(userId)) return true
    if (badges === undefined) return
    if (typeof alias.permissions === 'number') {
      switch (alias.permissions) {
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
          console.warn(`Unknown permission level: ${alias.permissions}`)
          return true
      }
    } else {
      for (const badge in badges) {
        if (alias.permissions.includes(badge)) return true
      }
    }
    this.isPermitted({permissions: 10}, {mod: 1}, 99)
    return false
  }

  /** Determine the remaining cooldown of `alias` in `channelId` for `userId` */
  public getCooldown(channelId: number, userId: number, alias: CommandAlias): number {
    const cooldowns = this.data.getData(channelId, 'cooldowns') as CooldownData
    if (!cooldowns) return 0
    let cd = 0
    let ucd = 0
    const now = Date.now()
    if (alias.cooldown) {
      if (typeof cooldowns.shared[alias.target] !== 'object') cooldowns.shared[alias.target] = []
      cd = next(cooldowns.shared[alias.target], alias.cooldown)
    }
    if (alias.userCooldown) {
      if (typeof cooldowns.user[alias.target] !== 'object') cooldowns.user[alias.target] = {}
      if (typeof cooldowns.user[alias.target][userId] !== 'object') cooldowns.user[alias.target][userId] = []
      ucd = next(cooldowns.user[alias.target][userId], alias.userCooldown)
    }
    return Math.max(cd, ucd)

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

  /** Loads `pluginId` if possible */
  public async loadPlugin(pluginId: string): Promise<AdvancedResult> {
    if (!this.paths[pluginId]) return {success: false, code: 'MISSING', message: 'Plugin path missing. The plugin has never been loaded?'}
    this.loadFromPath(this.paths[pluginId])
    const res = await this.waitPlugin(pluginId, 5000)
    if (!res) return {success: false, code: 'TIMEOUT', message: 'Plugin wait timeout'}
    return  {success: true}
  }

  /** Reloads `pluginId` if possible */
  public async reloadPlugin(pluginId: string): Promise<AdvancedResult> {
    const unloadRes = await this.unloadPlugin(pluginId, 5000)
    if (!unloadRes.success) return unloadRes
    return this.loadPlugin(pluginId)
  }

  /** Unloads `pluginId` if possible */
  public async unloadPlugin(pluginId: string, timeout?: number): Promise<AdvancedResult> {
    if (!this.paths[pluginId]) {
      return {success: false, code: 'MISSING', message: 'Plugin path missing. The plugin has never been loaded?'}
    }
    if (this.plugins[pluginId].noUnload) {
      return {success: false, code: 'UNSUPPORTED', message: 'Plugin explicitly does not support unloading'}
    }
    const res = await this.waitPlugin(pluginId, timeout) // Plugin must be loaded before unloading
    if (!res) {
      if (typeof timeout === 'number') return {success: false, code: 'TIMEOUT', message: 'Plugin wait timeout'}
      else return {success: false, code: 'TIMEOUT', message: 'Plugin is not loaded'}
    }

    const creates = this.plugins[pluginId].creates
    const reqPlugin: string[] = []
    const reqData: string[] = []
    // Check that other plugins dont require parts of this plugin
    for (const pid in this.plugins) {
      // Test if this plugin is vital
      if ((this.plugins[pid].requirePlugins || []).includes(pluginId)) {
        reqPlugin.push(pid)
      }
      // Test if this plugin's created data is vital
      if (creates) {
        for (const create of creates) {
          const createString = create.join()
          for (const require of (this.plugins[pid].requireDatas || [])) {
            const requireString = require.join()
            if (createString === requireString) {
              reqData.push(pid)
            }
          }
        }
      }
    }

    util.uniquify(reqPlugin, true)
    util.uniquify(reqData, true)
    if (reqPlugin.length && reqData.length) {
      return {success: false, code: 'REQUIRED', message: `Other plugins require this plugin (${reqPlugin.join(', ')}) and data created by this plugin (${reqData.join(', ')})`}
    } else if (reqPlugin.length) {
      return {success: false, code: 'REQUIREDPLUGIN', message: `Other plugins require this plugin (${reqPlugin.join(', ')})`}
    } else if (reqData.length) {
      return {success: false, code: 'REQUIREDDATA', message: `Other plugins require data created by this plugin (${reqData.join(', ')})`}
    }

    if (this.instances[pluginId].unload) await this.instances[pluginId].unload!()

    // Unload data
    const unloads: Array<Promise<any>> = []
    if (creates) {
      for (const create of creates) {
        if (create.length === 1) { // Channel data
          unloads.push(this.data.unautoLoad(create[0]))
        } else { // 2 length, thus non channel data
          unloads.push(this.data.save(create[0], create[1], true))
        }
      }
    }
    await Promise.all(unloads)

    delete this.plugins[pluginId]
    delete this.instances[pluginId]
    return {success: true}
  }

  /** Resolves with true when plugin is loaded or with false on timeout */
  public waitPlugin(pluginId: string, timeout?: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.instances[pluginId]) return resolve(true)
      if (!this.waits[pluginId]) this.waits[pluginId] = [resolve]
      else this.waits[pluginId].push(resolve)
      if (timeout !== undefined) {
        setTimeout(() => {
          // Resolve only if not resolved yet and remove from wait list
          if (this.waits[pluginId].includes(resolve)) {
            this.waits[pluginId].splice(this.waits[pluginId].indexOf(resolve), 1)
            resolve()
          }
        }, timeout, false)
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

  private loadFromPath(path: string) {
    delete require.cache[require.resolve(path)] // Delete cache entry if it exists
    const plugin: {options: PluginOptions, Instance: new() => PluginInstance} = require(path)
    const options = plugin.options
    if (options) {
      const type = options.type // Cant use options in default case
      this.paths[options.id] = path
      this.plugins[options.id] = options
      switch (options.type) {
        case 'command':
          if (Array.isArray(options.default.alias)) {
            options.default.alias.forEach((alias) => {
              this.defaultAliases[alias] = {...options.default.options, target: options.id}
            })
          } else {
            this.defaultAliases[options.default.alias] = {...options.default.options, target: options.id}
          }
          break
        case 'controller':
          break
        default:
          throw new Error('Unknown plugin type: ' + type)
      }
      this.instantiatePlugin(options, plugin.Instance) // Maybe this should be awaited?
      return options
    } else throw console.error('Plugin lacks options export: ' + path)
  }

  private async instantiatePlugin(options: PluginOptions, instantiator: new(pluginLib: PluginLibrary) => PluginInstance) {
    // console.log(`Instantiating ${options.id}`)
    let res: Array<object | undefined> = []
    // Wait for requirements. Do not wait for channel data requirements
    if (options.requireDatas && options.requireDatas.map(v => typeof v === 'string').length === 3) {
      res = await Promise.all(options.requireDatas.map(v => this.data.waitData(v[0], v[1], v[2] || 3000)))
      if (res.some(v => v === undefined)) { // A wait promise timedout
        console.log(`${options.id} instantiation still waiting for data.`)
        await Promise.all(options.requireDatas.map(v => this.data.waitData(v[0], v[1])))
      }
    }
    if (options.requirePlugins) await Promise.all(options.requirePlugins.map(id => this.waitPlugin(id)))
    const instance = new instantiator(this.pluginLib)
    if (typeof instance.init === 'function') await instance.init()
    // console.log(`Instantiated ${options.id}`)
    this.instances[options.id] = instance
    this.resolveWaits(options.id)
    if (options.type === 'command' && typeof this.instances[options.id].call !== 'function') {
      throw new Error(`Invalid call function on command plugin instance: ${this.plugins[options.id].id}`)
    }
  }

  private async onChat(channelId: number, userId: number, tags: PRIVMSG['tags'], message: string, me: boolean, self: boolean) {
    if (self) return // Bot shouldn't trigger commands
    const params = message.split(' ')
    const alias = this.getAlias(channelId, params[0].toLowerCase()) || this.getGlobalAlias(params[0].toLowerCase())
    if (!alias || alias.disabled) return
    const instance = this.instances[alias.target]
    // Make sure the plugin is loaded
    if (!instance) return console.log(`Cannot call unloaded command: ${alias.target}`)
    if (!instance.call) throw new Error(`No call function on command plugin: ${alias.target}`)
    // Check permissions (master users always have permissions)
    if (!alias.permissions || this.isPermitted({permissions: alias.permissions}, tags.badges, userId)) {
      if (this.masters.includes(userId)) {
        // Master users don't care about cooldowns
        const res = await instance.call(channelId, userId, tags, params, { alias, message, me, cooldown: 0 })
        if (res) this.client.chat(channelId, res)
      } else {
        const cooldown = this.getCooldown(channelId, userId, alias)
        if (cooldown <= 0) {
          // Passing
          const cooldowns = this.data.getData(channelId, 'cooldowns') as CooldownData
          if (cooldowns) {
            // Add entries to cooldowns
            if (alias.cooldown) cooldowns.shared[alias.target].push(Date.now())
            if (alias.userCooldown) cooldowns.user[alias.target][userId].push(Date.now())
          }
          const res = await instance.call(channelId, userId, tags, params, { alias, message, me, cooldown })
          if (res) this.client.chat(channelId, res)
        } else {
          // On cooldown
          if (instance.cooldown) { instance.cooldown(channelId, userId, tags, params, { alias, message, me, cooldown })
          }
          return
        }
      }
    }
  }
}

interface CooldownData {
  user: { [commandId: string]: { [userId: number]: number[] } }
  shared: { [commandId: string]: number[] }
}
