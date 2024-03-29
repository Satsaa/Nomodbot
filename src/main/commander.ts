import * as path from 'path'

import TwitchClient from './client/client'
import { IrcMessage, PRIVMSG } from './client/parser'
import Data from './data'
import deepClone from './lib/deepClone'
import * as util from './lib/util'
import { readDirRecursive } from './lib/util'
import ParamValidator from './paramValidator'
import PluginLibrary from './pluginLib'
import logger from './logger'

export type PluginOptions = (Command | Controller) & PluginBase

interface PluginBase {
  type: string
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

/** Controls a data type or something like that */
export interface Controller {
  type: 'controller'
}

export interface Command {
  type: 'command'
  default: {
    /** Default command alias(es) (e.g. !command) */
    alias: string | string[]
    options: Omit<CommandAlias, 'target' | 'whitelist' | 'blacklist'>
  }
  /**
   * Usage instructions  
   * Object form allows aliases to use specific groups of help strings with their `group` key  
   */
  help: string[] | { default: string[], [group: string]: string[] }
  /**
   * Disable dynamic insertion of @user before messages  
   * \@user is inserted when the message is short and doesn't include the user's login or display name
   */
  disableMention?: true
  /** Disable removal of @user and the following words when calling this command */
  allowMentions?: true
  /** Whisper on cooldown */
  whisperOnCd?: true
}

interface IsPermittedOptions {
  ignoreBlackList?: boolean
  ignoreWhiteList?: boolean
}

/** Properties for aliases */
export interface CommandAlias {
  /** The unique iq of a command plugin */
  target: string
  disabled?: true
  /** 
   * Controls who can use this command  
   * Number: 0: anyone, 2: subscriber, 4: vip, 6: moderator, 8: broadcaster, 10: master
   */
  userlvl?: Userlvl
  /** Cooldowns are in seconds */
  cooldown?: number
  /** Cooldowns are in seconds */
  userCooldown?: number
  /** Marks the alias as hidden (e.g. hidden commands are not shown with !commands) */
  hidden?: true
  /** Group to use in supporting functionality. Defaults to 'default' */
  group?: string
  /** Custom data that the command plugin can handle */
  data?: any
  /** List of user ids that can use this alias without checking permissions */
  whitelist?: number[]
  /** List of user ids that may not use this alias at all */
  blacklist?: number[]
}

type CommandAliasSource = CommandAlias | ReadonlyCommandAlias

export type ReadonlyCommandAlias = DeepReadonly<CommandAlias>

type DefaultCommandAlias = Readonly<Omit<CommandAlias, 'blacklist' | 'whitelist'>>

type Source = MaybeArray<{ options: PluginOptions, Instance: new () => PluginInstance }>

/** isPermitted helper type */
type CommandAliasLike = {
  userlvl?: Userlvl
  whitelist?: number[]
  blacklist?: number[]
} | DeepReadonly<{ userlvl?: Userlvl, whitelist?: number[], blacklist?: number[] }>

/** userlvls */
export enum Userlvl {
  any = 0,
  sub = 2,
  vip = 4,
  mod = 6,
  streamer = 8,
  master = 10,
}

interface AliasData {
  /** Channel aliases */
  aliases: { [x: string]: CommandAlias }
  /** Defined keys make global aliases "deleted"/disabled for the channel */
  deletes: { [x: string]: true }
}

interface CooldownData {
  user: { [pluginId: string]: { [userId: number]: number[] } }
  shared: { [pluginId: string]: number[] }
}

export interface Extra {
  /** Used alias */
  alias: DefaultCommandAlias
  /** Message split by spaces */
  words: string[]
  /**
   * Full chat message  
   * Action headers are not included
   */
  message: string
  /** Message was an action (/me) */
  me: boolean
  /** Remaining cooldown when trying to trigger command */
  cooldown: number
  /** IRCv3 parsed message that caused this call */
  irc: PRIVMSG
  /** Userlevel of user */
  userlvl: Userlvl
}

export interface AdvancedMessage {
  /** Ordered message segments */
  segments: string[]
  /** Priority of segments when truncating to maximum message length */
  segmentPriority?: number[]
  /** Override default truncation options */
  truncationSettings?: Omit<util.FitStringOptions, 'maxLength'>
  /** Override whisper handling */
  whisper?: boolean
  /** Override @user handling */
  atUser?: boolean
  /** Length of message will be truncated to maximum message length multiplied by this */
  lengthMult?: number
}

export interface Handlers {
  call: {
    default: Array<{
      params: string
      handler: (channelId: number, userId: number, params: any, extra: Extra) => Promise<AdvancedMessage | string | void>
    }>
    [group: string]: Array<{
      params: string
      handler: (channelId: number, userId: number, params: any, extra: Extra) => Promise<AdvancedMessage | string | void>
    }>
  }
  cd: {
    default: Array<{
      handler?: (channelId: number, userId: number, params: any, extra: Extra) => Promise<AdvancedMessage | string | void>
    }>
    [group: string]: Array<{
      handler?: (channelId: number, userId: number, params: any, extra: Extra) => Promise<AdvancedMessage | string | void>
    }>
  }
}

export interface PluginInstance {
  /** This plugin is being loaded, execute before enabling this plugin */
  init?: () => Promise<void>
  /**
   * Use PluginLib#addHandlers  
   */
  handlers?: Handlers
  /** This plugin is being unloaded (not when the bot is shutting down). Creates are unloaded automatically after this */
  unload?: () => Promise<void>
}

export default class Commander {
  public defaultAliases: { [alias: string]: DefaultCommandAlias }
  public paths: { [pluginId: string]: string }
  public plugins: { [pluginId: string]: PluginOptions }
  public instances: { [pluginId: string]: PluginInstance }
  /** Big bois with big privileges */
  public masters: readonly number[]
  private client: TwitchClient
  private data: Data
  private pluginLib: PluginLibrary
  private waits: { [pluginId: string]: Array<(result: boolean) => any> }
  private validator: ParamValidator

  constructor(client: TwitchClient, data: Data, masters: readonly number[]) {
    this.defaultAliases = {}
    this.paths = {}
    this.plugins = {}
    this.instances = {}
    this.masters = masters
    this.client = client
    this.data = data
    this.pluginLib = new PluginLibrary(client, data, this)
    this.waits = {}
    this.validator = new ParamValidator(this, this.client)

    this.client.on('mod', this.onMod.bind(this))
    this.client.on('chat', this.onChat.bind(this))
  }

  /**
   * Loads all plugins in the plugin folder and it's subfolders  
   * @returns List of loaded plugin ids
   */
  public async init(): Promise<string[]> {
    this.data.autoLoad('aliases', { aliases: {}, deletes: {} } as AliasData, true)
    this.data.autoLoad('cooldowns', { user: {}, shared: {} as CooldownData }, true)

    const files = (await readDirRecursive(path.join(__dirname, '..', 'plugins')))
      .filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.includes('tempCodeRunnerFile'))
    const optionsArr = (await Promise.all(files.map(file => this.loadFromPath(file)))).flat()
    this.findConflicts(optionsArr, files)
    await Promise.all(optionsArr)
    return optionsArr.map((v: any) => v.id)
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
          if (!created.includes(makePath(e))) {
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

  public delAlias(channelId: number, alias: string): boolean {
    alias = alias.toLowerCase()
    if (!(this.data.data[channelId] || {}).aliases) return false
    delete this.data.data[channelId].aliases.aliases[alias]
    this.data.data[channelId].aliases.deletes[alias] = true
    return true
  }

  /** Merge `options` over `alias` */
  public modAlias(channelId: number, alias: string, options: Partial<CommandAliasSource>): ReadonlyCommandAlias | void {
    alias = alias.toLowerCase()
    if (!(this.data.data[channelId] || {}).aliases.aliases) return
    if (!this.data.data[channelId].aliases.aliases[alias]) {
      // Copy global alias
      if (this.data.data[channelId].aliases.deletes[alias]) return
      if (!this.defaultAliases[alias]) return
      this.data.data[channelId].aliases.aliases[alias] = deepClone(this.defaultAliases[alias])
    }
    this.data.data[channelId].aliases.aliases[alias] = deepClone({ ...this.data.data[channelId].aliases.aliases[alias], ...options })
    this.data.data[channelId].aliases.deletes[alias] = true
    return this.data.data[channelId].aliases.aliases[alias]
  }

  public setAlias(channelId: number, alias: string, options: CommandAliasSource): ReadonlyCommandAlias | void {
    alias = alias.toLowerCase()
    if (!(this.data.data[channelId] || {}).aliases.aliases) return
    this.data.data[channelId].aliases.aliases[alias] = deepClone(options)
    this.data.data[channelId].aliases.deletes[alias] = true
    return this.data.data[channelId].aliases.aliases[alias]
  }

  public getAlias(channelId: number, alias: string): ReadonlyCommandAlias | void {
    alias = alias.toLowerCase()
    if (!(this.data.data[channelId] || {}).aliases) return
    if (!this.data.data[channelId].aliases.deletes[alias]) {
      return this.defaultAliases[alias] || this.data.data[channelId].aliases.aliases[alias]
    }
    return this.data.data[channelId].aliases.aliases[alias]
  }

  public getAliases(channelId: number): { [x: string]: ReadonlyCommandAlias } | void {
    if (!(this.data.data[channelId] || {}).aliases) return

    const defaults: { [x: string]: ReadonlyCommandAlias } = {}
    for (const key in this.defaultAliases) {
      if (!this.data.data[channelId].aliases.deletes[key]) defaults[key] = this.defaultAliases[key]
    }
    return { ...defaults, ...this.data.data[channelId].aliases.aliases }
  }

  public getAliasesById(channelId: number, pluginId: string): { [x: string]: ReadonlyCommandAlias } | void {
    if (!(this.data.data[channelId] || {}).aliases) return

    const res: { [x: string]: ReadonlyCommandAlias } = {}
    for (const key in this.defaultAliases) {
      if (!this.data.data[channelId].aliases.deletes[key] && this.defaultAliases[key].target === pluginId) {
        res[key] = this.defaultAliases[key]
      }
    }

    const locals = this.data.data[channelId].aliases.aliases
    for (const key in locals) {
      if (locals[key].target === pluginId) res[key] = locals[key]
    }
    return res
  }

  /** Determine userlevel */
  public getUserlvl(userId: number, badges: IrcMessage['tags']['badges']): Userlvl {
    // Number: 0: anyone, 2: subscriber, 4: vip, 6: moderator, 8: broadcaster, 10: master
    if (this.masters.includes(userId)) return Userlvl.master // Master
    if (!badges) return Userlvl.any
    if (typeof badges.broadcaster !== 'undefined') return Userlvl.streamer
    if (typeof badges.moderator !== 'undefined') return Userlvl.mod
    if (typeof badges.vip !== 'undefined') return Userlvl.vip
    if (typeof badges.subscriber !== 'undefined') return Userlvl.sub
    return Userlvl.any
  }

  /** Determine if `userId` with `badges` would be permitted to call this alias */
  public isPermitted(alias: CommandAliasLike, userId: number, badges: IrcMessage['tags']['badges'], options: IsPermittedOptions = {}) {
    const userlvl = this.getUserlvl(userId, badges)
    if (userlvl >= Userlvl.master) return true
    if (!badges) return alias.userlvl === Userlvl.any
    if (userlvl < Userlvl.mod) {
      if (!options.ignoreBlackList && alias.blacklist && alias.blacklist.includes(userId)) return false
      if (!options.ignoreWhiteList && alias.whitelist && alias.whitelist.includes(userId)) return true
    }
    return userlvl >= (alias.userlvl || 0)
  }

  /** Determine the remaining cooldown of `alias` in `channelId` for `userId` */
  public getCooldown(channelId: number, userId: number, alias: DefaultCommandAlias): number {
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

    function next(times: number[], opts: number | { duration?: number, delay?: number, limit?: number }) {
      if (typeof opts === 'number') {
        opts = { duration: opts, delay: 0, limit: 1 }
      } else {
        if (typeof opts.delay === 'undefined') opts.delay = 0
        if (typeof opts.duration === 'undefined') opts.duration = 30000
        if (typeof opts.limit === 'undefined') opts.limit = 1
      }

      const duration = opts.duration! * 1000

      // Remove times older than duration
      for (let i = 0; i < times.length; i++) {
        if (times[i] < now - duration) { // time is expired
          times.shift()
          i--
        } else {
          break
        }
      }
      // Calculate next time
      if (times.length < opts.limit!) { // Limit is not reached calculate needed wait for delay
        return times.length ? times[times.length - 1] + opts.delay! - now : 0
      } else {
        const exceeds = times.length - opts.limit!
        const delayTest = times[times.length - 1] + opts.delay! - now // test only for delay
        const limitTest = times[exceeds + 0] + duration - now // test all but delay
        return Math.max(delayTest, limitTest)
      }
    }
  }

  public async loadFromPath(path: string) {
    path = require.resolve(path)
    delete require.cache[path] // Delete cache entry

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const source: Source = require(path) // (await import(path)).default !!! When es modules supported

    // Check if multi plugin file
    if (Array.isArray(source)) {
      return source.map(source => handle.bind(this)(path, source))
    } else {
      return [handle.bind(this)(path, source)]
    }

    function handle(this: Commander, path: string, plugin: { options: PluginOptions, Instance: new () => PluginInstance }) {
      const _plugin: { options: PluginOptions, Instance: new () => PluginInstance } = plugin
      const options = _plugin.options
      if (options) {
        const type = options.type // Cant use options in default case
        this.paths[options.id] = path
        this.plugins[options.id] = options
        switch (options.type) {
          case 'command':
            if (Array.isArray(options.default.alias)) {
              options.default.alias.forEach((alias) => {
                this.defaultAliases[alias] = { ...deepClone(options.default.options), ...{ target: options.id } }
              })
            } else {
              this.defaultAliases[options.default.alias] = { ...deepClone(options.default.options), ...{ target: options.id } }
            }
            break
          case 'controller':
            break
          default:
            throw new Error(`Unknown plugin type: ${type}`)
        }
        this.instantiatePlugin(options, _plugin.Instance) // Maybe this should be awaited? !!!
        return options
      } else {
        throw new Error(`Plugin lacks options export: ${path}`)
      }
    }
  }

  /** Loads `pluginId` if possible */
  public async loadPlugin(pluginId: string, timeout = 5000): Promise<AdvancedResult> {
    if (!this.paths[pluginId]) return { success: false, code: 'MISSING', message: 'Plugin path missing. The plugin has never been loaded?' }
    await this.loadFromPath(this.paths[pluginId])

    const res = await this.waitPlugin(pluginId, timeout)
    if (!res) return { success: false, code: 'TIMEOUT', message: 'Plugin wait timeout. The plugin may still finish loading later' }
    return { success: true }
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
      return { success: false, code: 'MISSING', message: 'Plugin path missing. The plugin has never been loaded?' }
    }
    if (this.plugins[pluginId].noUnload) {
      return { success: false, code: 'UNSUPPORTED', message: 'Plugin explicitly does not support unloading' }
    }

    const res = await this.waitPlugin(pluginId, timeout) // Plugin must be loaded before unloading
    if (!res) {
      if (typeof timeout === 'number') return { success: false, code: 'TIMEOUT', message: 'Plugin wait timeout' }
      else return { success: false, code: 'UNLOADED', message: 'Plugin is not loaded' }
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
          const createString = create.join('/')
          for (const require of this.plugins[pid].requireDatas || []) {
            const requireString = require.join('/')
            if (createString === requireString) {
              reqData.push(pid)
            }
          }
        }
      }
    }

    util.deduplicate(reqPlugin, true)
    util.deduplicate(reqData, true)
    if (reqPlugin.length && reqData.length) {
      return { success: false, code: 'REQUIRED', message: `Other plugins require this plugin (${reqPlugin.join(', ')}) and data created by this plugin (${reqData.join(', ')})` }
    } else if (reqPlugin.length) {
      return { success: false, code: 'REQUIREDPLUGIN', message: `Other plugins require this plugin (${reqPlugin.join(', ')})` }
    } else if (reqData.length) {
      return { success: false, code: 'REQUIREDDATA', message: `Other plugins require data created by this plugin (${reqData.join(', ')})` }
    }

    this.validator.uncacheHelp(pluginId)

    if (this.instances[pluginId].unload) await this.instances[pluginId].unload!()

    // Disable default aliases
    for (const name in this.defaultAliases) {
      if (this.defaultAliases[name].target === pluginId) delete this.defaultAliases[name]
    }

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
    return { success: true }
  }

  /** Determines if @user should be inserted to message */
  public shouldAtUser(atUser: Command['disableMention'], message: string, irc: PRIVMSG): boolean {
    if (atUser) return false
    message = message.toLowerCase()
    if (message.length > 200) return false
    if (message.includes(irc.user)) return false
    if (message.includes(irc.tags['display-name'].toLowerCase())) return false
    return true
  }

  /** Returns the `'@<user> '` string */
  public getAtUser(display: string): string {
    return `@${display} `
  }

  /** Resolves with true when plugin is loaded or with false on timeout */
  public waitPlugin(pluginId: string, timeout?: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.instances[pluginId]) return resolve(true)
      if (this.waits[pluginId]) this.waits[pluginId].push(resolve)
      else this.waits[pluginId] = [resolve]
      if (timeout !== undefined) {
        setTimeout(() => {
          // Resolve only if not resolved yet and remove from wait list
          if (this.waits[pluginId].includes(resolve)) {
            this.waits[pluginId].splice(this.waits[pluginId].indexOf(resolve), 1)
            resolve(true)
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

  private async instantiatePlugin(options: PluginOptions, instantiator: new (pluginLib: PluginLibrary) => PluginInstance) {
    // logger.info(`Instantiating ${options.id}`)
    let res: Array<object | undefined> = []
    // Wait for requirements. Do not wait for channel data requirements
    if (options.requireDatas && options.requireDatas.map(v => typeof v === 'string').length === 3) {
      res = await Promise.all(options.requireDatas.map(v => this.data.waitData(v[0], v[1], v[2] || 3000)))
      if (res.some(v => v === undefined)) { // A wait promise timedout
        logger.warn(`${options.id} instantiation still waiting for data.`)
        await Promise.all(options.requireDatas.map(v => this.data.waitData(v[0], v[1])))
      }
    }
    if (options.requirePlugins) await Promise.all(options.requirePlugins.map(id => this.waitPlugin(id)))

    const instance = new instantiator(this.pluginLib)
    if (typeof instance.init === 'function') await instance.init()
    // Cache parameters
    if (instance.handlers && instance.handlers.call) this.validator.cacheHelp(options.id, instance.handlers.call)
    this.instances[options.id] = instance
    this.resolveWaits(options.id)
    if (options.type === 'command' && (!instance.handlers || !instance.handlers.call)) {
      throw new Error(`Handlers required for command plugins: ${this.plugins[options.id].id}`)
    }
  }

  private async onMod(channelId: number, login: string, mod: boolean) {
    if (!mod) return

    const userId = this.client.api.cachedId(login)
    if (!userId) return

    const aliases = this.getAliases(channelId)
    if (!aliases) return
    // Remove moderators from blacklists
    for (const name in aliases) {
      if (aliases[name].blacklist) {
        const newList = aliases[name].blacklist!.filter(v => v !== userId)
        this.modAlias(channelId, name, { blacklist: newList })
      }
    }
  }

  private async onChat(channelId: number, userId: number, message: string, irc: PRIVMSG, me: boolean, self: boolean) {
    if (self) return

    let words = message.split(' ')
    const alias = this.getAlias(channelId, words[0])
    if (!alias || alias.disabled) return

    const group = alias.group || 'default'
    const instance = this.instances[alias.target]
    const plugin = this.plugins[alias.target]
    if (!plugin || !instance) return logger.info('Nonexisting target:', alias.target)
    if (plugin.type !== 'command') return logger.info(`Tried to call a non command plugin: ${alias.target}`)
    if (!plugin.allowMentions) message = message.replace(/ @.*/, '') // Remove @user... from command calls
    words = message.split(' ')
    // Make sure the plugin is loaded
    if (!instance) return logger.info(`Cannot call unloaded command: ${alias.target}`)
    if (!instance.handlers || !instance.handlers.call) throw new Error(`No handlers on command plugin: ${alias.target}`)
    // Check permissions (master users always have permissions)
    if (this.isPermitted(alias, userId, irc.tags.badges)) {
      const userlvl = this.getUserlvl(userId, irc.tags.badges)
      if (userlvl >= Userlvl.mod) {
        // Master users, mods and the broadcaster don't care about cooldowns
        const validation = await this.validator.validate(channelId, plugin.id, words.slice(1), alias.group)
        if (!validation.pass) {
          return this.client.chat(channelId, `${addAtUser(this, plugin.disableMention, validation.message, irc)}${validation.message}`)
        }

        const extra: Extra = { alias, words, message, me, cooldown: 0, irc, userlvl }
        let res = await instance.handlers.call[group][validation.index].handler(channelId, userId, validation.values, extra)
        if (typeof res === 'object') {
          res = handleAdvanced(this, res, plugin, false)
        }
        if (res) {
          this.client.chat(channelId, `${addAtUser(this, plugin.disableMention, res, irc)}${res}`)
        }
      } else {
        const cooldown = this.getCooldown(channelId, userId, alias)

        // Whisper on cooldown and use callHandler
        let whisperCall = false
        if (cooldown > 0 && plugin.whisperOnCd) whisperCall = true

        if (cooldown <= 0 || whisperCall) { // Passing
          const cooldowns = this.data.getData(channelId, 'cooldowns') as CooldownData
          if (cooldowns && !whisperCall) {
            // Add entries to cooldowns
            if (alias.cooldown) cooldowns.shared[alias.target].push(Date.now())
            if (alias.userCooldown && alias.userCooldown > (alias.cooldown || 0)) cooldowns.user[alias.target][userId].push(Date.now())
          }

          const validation = await this.validator.validate(channelId, plugin.id, words.slice(1), alias.group)
          if (!validation.pass) {
            if (whisperCall) this.client.whisper(userId, validation.message)
            else this.client.chat(channelId, `${addAtUser(this, plugin.disableMention, validation.message, irc)}${validation.message}`)
            return
          }

          const extra: Extra = { alias, words, message, me, cooldown, irc, userlvl }
          let res = await instance.handlers.call[group][validation.index].handler(channelId, userId, validation.values, extra)
          if (typeof res === 'object') {
            res = handleAdvanced(this, res, plugin, whisperCall)
          }
          if (res) {
            if (whisperCall) this.client.whisper(userId, res)
            else this.client.chat(channelId, `${addAtUser(this, plugin.disableMention, res, irc)}${res}`)
          }
        } else if (instance.handlers.cd[group]) { // Call cooldown handlers if defined
          const validation = await this.validator.validate(channelId, plugin.id, words.slice(1), alias.group)
          if (!validation.pass) return

          if (!instance.handlers.cd[group][validation.index].handler) return

          const extra: Extra = { alias, words, message, me, cooldown, irc, userlvl }
          let res = await instance.handlers.cd[group][validation.index].handler!(channelId, userId, validation.values, extra)
          if (typeof res === 'object') res = handleAdvanced(this, res, plugin, true)
          if (res) this.client.whisper(userId, res)
        }
      }
    }
    function handleAdvanced(com: Commander, adv: AdvancedMessage, plugin: Command & PluginBase, whisper: boolean): string {
      if (adv.segmentPriority && adv.segmentPriority.length) {
        const fitParams: Array<[string, number]> = []
        // Add @user as a "high" priority segment
        if (!whisper && ((adv.atUser === undefined && plugin.allowMentions) || adv.atUser)) {
          fitParams.push([com.getAtUser(com.client.api.cachedDisplay(userId) || 'Unknown'), Infinity])
        }
        for (let i = 0; i < adv.segments.length; i++) {
          const segment = adv.segments[i]
          fitParams.push([segment, adv.segmentPriority[i] || 0])
        }

        const fitOps: util.FitStringOptions = { maxLength: com.client.opts.maxMsgLength * (adv.lengthMult || 1), ...adv.truncationSettings }

        const fitted = util.fitStrings(fitOps, ...fitParams)
        return fitted
      }
      if (!whisper && ((adv.atUser === undefined && plugin.allowMentions) || adv.atUser)) {
        return com.getAtUser(com.client.api.cachedDisplay(userId) || 'Unknown') + adv.segments.join('')
      }
      return adv.segments.join('')
    }
    function addAtUser(self: Commander, atUser: true | undefined, message: string, irc: PRIVMSG): string {
      return self.shouldAtUser(atUser, message, irc) ? `${self.getAtUser(self.client.api.cachedDisplay(userId) || 'Unknown')}` : ''
    }
  }
}
