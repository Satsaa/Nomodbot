import * as path from 'path'

import TwitchClient from './client/Client'
import { IrcMessage, PRIVMSG } from './client/parser'
import Data from './Data'
import deepClone from './lib/deepClone'
import * as util from './lib/util'
import { readDirRecursive } from './lib/util'
import ParamValidator from './ParamValidator'
import PluginLibrary from './PluginLib'

export type PluginOptions = (Command | Controller) & PluginBase

interface PluginBase {
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

/** Controls a data type or something like that */
export interface Controller {
  type: 'controller',
}

export interface Command {
  type: 'command',
  default: {
    /** Default command alias(es) (e.g. !command) */
    alias: string | string[],
    options: Omit<CommandAlias, 'target' | 'whitelist' | 'blacklist'>,
  }
  /**
   * Help strings (usage instructions)
   * Object form allows aliases to use specific groups of help strings with their `group` key
   * Format for entries should be: "Explaining the action: {command} add <COMMAND> <message...>"
   * Or just the explanation: "Explaining this and that"
   * @see `README.md`#parameter-validator for details
   */
  help: string[] | {[group: string]: string[], default: string[]},
  /**
   * Disable dynamic insertion of @user before messages
   * \@user is inserted when the message is short and doesn't include the user's login or display name
   */
  disableMention?: true
  /** Disable removal of @user and the following words when calling this command */
  unignoreMentions?: true
}

interface IsPermittedOptions {
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
  userlvl?: userlvls,
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

type ReadonlyCommandAlias = DeepReadonly<CommandAlias>

/** Properties for default aliases */
export interface DefaultCommandAlias extends Readonly<Omit<CommandAlias, 'blacklist' | 'whitelist'>> {}

type Source = MaybeArray<{options: PluginOptions, Instance: new() => PluginInstance}>

/** isPermitted helper type */
type CommandAliasLike = {
  userlvl?: userlvls,
  whitelist?: number[],
  blacklist?: number[]
} | DeepReadonly<{userlvl?: userlvls, whitelist?: number[], blacklist?: number[]}>

/** userlvls */
export enum userlvls {
  any = 0,
  sub = 2,
  vip = 4,
  mod = 6,
  streamer = 8,
  master = 10,
}

export interface Extra {
  /** Used alias */
  alias: DefaultCommandAlias,
  /** Full* chat message *Action headers are not included */
  message: string,
  /** Message was an action (/me) */
  me: boolean,
  /** Remaining cooldown when trying to trigger command */
  cooldown: number,
  /** IRCv3 parsed message that  */
  irc: PRIVMSG
}

interface AliasData {
  /** Channel aliases */
  aliases: { [x: string]: CommandAlias }
  /** Defined keys make global aliases "deleted"/disabled for the channel */
  deletes: { [x: string]: true }
}

interface CooldownData {
  user: { [commandId: string]: { [userId: number]: number[] } }
  shared: { [commandId: string]: number[] }
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
  public defaultAliases: {[alias: string]: DefaultCommandAlias}
  public paths: {[pluginId: string]: string}
  public plugins: {[pluginId: string]: PluginOptions}
  public instances: {[pluginId: string]: PluginInstance}
  /** Big bois with big privileges */
  public masters: number[]
  private client: TwitchClient
  private data: Data
  private pluginLib: PluginLibrary
  private waits: {[pluginId: string]: Array<(result: boolean) => any>}
  private validator: ParamValidator

  constructor(client: TwitchClient, data: Data, masters: number[]) {
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
            .filter(f => ((f.endsWith('.ts') || f.endsWith('.js')) && !f.includes('tempCodeRunnerFile'))),
          optionsArr = files.map(file => this.loadFromPath(file)).flat()
    this.findConflicts(optionsArr, files)
    await Promise.all(optionsArr)
    return optionsArr.map(v => v.id)
  }

  /** Check for duplicate data type creations and if a plugin requires data that no present plugin creates */
  public findConflicts(optionsArray: PluginOptions[], files: string[]) {
    const messages: string[] = [], // Error messages
          created: string[] = [], // Created data types
          titles: string[] = [], // Corresponding plugin title for created entries
          ids: string[] = [] // Ids of plugins
    // Fill ids
    optionsArray.forEach((c, i) => {
      if (ids.includes(c.id))
        messages.push(`${c.id}'s id is duplicated in ${path.basename(files[i])} and ${path.basename(files[ids.indexOf(c.id)])}`)

      ids.push(c.id)
    })
    // Check for id duplicates
    optionsArray.forEach((c) => {
      if (c.creates) {
        c.creates.forEach((e) => {
          if (created.includes(makePath(e)))
            messages.push(`${c.title} duplicates ${makePath(e)} from ${titles[created.indexOf(makePath(e))]}`)

          titles.push(c.title)
          created.push(makePath(e))
        })
      }
    })
    // Check for required data that is not loaded by any command
    optionsArray.forEach((r) => {
      if (r.requireDatas) {
        r.requireDatas.forEach((e) => {
          if (created.indexOf(makePath(e)) === -1)
            messages.push(`${r.title} requires ${makePath(e)}`)
        })
      }
    })
    // Check for self requirement
    optionsArray.forEach((c) => {
      if (c.creates) {
        c.creates.forEach((cr) => {
          if (c.requireDatas) {
            c.requireDatas.forEach((re) => {
              if (makePath(cr) === makePath(re))
                messages.push(`${c.id} requires data that it creates`)
            })
          }
        })
      }
    })
    if (messages.length)
      throw new Error(messages.join('. '))

    function makePath(source: [string, (string | number)?, number?]) {
      const pathOnly = source.filter(v => typeof v === 'string')
      if (pathOnly.length === 2)
        return `${pathOnly[0]}\\${pathOnly[1]}`
      return `#CHANNEL\\${pathOnly[0]}`
    }
  }

  public delAlias(channelId: number, alias: string): boolean {
    alias = alias.toLowerCase()
    if (!((this.data.data[channelId] || {}).aliases))
      return false
    delete this.data.data[channelId].aliases.aliases[alias]
    this.data.data[channelId].aliases.deletes[alias] = true
    return true
  }

  /** Merge `options` to an existing alias `alias` */
  public modAlias(channelId: number, alias: string, options: Partial<CommandAliasSource>): ReadonlyCommandAlias | void {
    alias = alias.toLowerCase()
    if (!((this.data.data[channelId] || {}).aliases.aliases))
      return
    if (!this.data.data[channelId].aliases.aliases[alias]) {
      // Copy global alias
      if (this.data.data[channelId].aliases.deletes[alias])
        return
      if (!this.defaultAliases[alias])
        return
      this.data.data[channelId].aliases.aliases[alias] = deepClone(this.defaultAliases[alias])
    }
    this.data.data[channelId].aliases.aliases[alias] = deepClone({ ...this.data.data[channelId].aliases.aliases[alias], ...options })
    this.data.data[channelId].aliases.deletes[alias] = true
    return this.data.data[channelId].aliases.aliases[alias]
  }

  public setAlias(channelId: number, alias: string, options: CommandAliasSource): ReadonlyCommandAlias | void {
    alias = alias.toLowerCase()
    if (!((this.data.data[channelId] || {}).aliases.aliases))
      return
    this.data.data[channelId].aliases.aliases[alias] = deepClone(options)
    this.data.data[channelId].aliases.deletes[alias] = true
    return this.data.data[channelId].aliases.aliases[alias]
  }

  public getAlias(channelId: number, alias: string): ReadonlyCommandAlias | void {
    alias = alias.toLowerCase()
    if (!((this.data.data[channelId] || {}).aliases))
      return
    if (!this.data.data[channelId].aliases.deletes[alias])
      return this.defaultAliases[alias] || this.data.data[channelId].aliases.aliases[alias]

    return this.data.data[channelId].aliases.aliases[alias]
  }

  public getAliases(channelId: number): {[x: string]: ReadonlyCommandAlias} | void {
    if (!((this.data.data[channelId] || {}).aliases))
      return

    const defaults: {[x: string]: DefaultCommandAlias} = {}
    for (const key in this.defaultAliases) {
      if (!this.data.data[channelId].aliases.deletes[key])
        defaults[key] = this.defaultAliases[key]
    }

    return { ...defaults, ...this.data.data[channelId].aliases.aliases }
  }

  public getAliasesById(channelId: number, pluginId: string): {[x: string]: ReadonlyCommandAlias} | void {
    if (!((this.data.data[channelId] || {}).aliases))
      return

    const res: {[x: string]: DefaultCommandAlias} = {}
    for (const key in this.defaultAliases) {
      if (!this.data.data[channelId].aliases.deletes[key] && this.defaultAliases[key].target === pluginId)
        res[key] = this.defaultAliases[key]
    }

    const locals = this.data.data[channelId].aliases.aliases
    for (const key in locals) {
      if (locals[key].target === pluginId)
        res[key] = locals[key]
    }

    return res
  }

  /** Determine if `userId` with `badges` would be permitted to call this alias */
  public isPermitted(alias: CommandAliasLike, userId: number, badges: IrcMessage['tags']['badges'], options: IsPermittedOptions = {}) {
    // Number: 0: anyone, 2: subscriber, 4: vip, 6: moderator, 8: broadcaster, 10: master
    if (this.masters.includes(userId))
      return true // Master
    if (!badges)
      badges = {}
    if (alias.blacklist && alias.blacklist.includes(userId) && !badges.moderator && !badges.broadcaster)
      return false
    if (!options.ignoreWhiteList && alias.whitelist && alias.whitelist.includes(userId))
      return true
    switch (alias.userlvl) {
      case undefined:
      case userlvls.any:
        return true
        // Fallthrough
      case userlvls.sub:
        if (typeof badges.subscriber !== 'undefined')
          return true
        // Fallthrough
      case userlvls.vip:
        if (typeof badges.vip !== 'undefined')
          return true
        // Fallthrough
      case userlvls.mod:
        if (typeof badges.moderator !== 'undefined')
          return true
        // Fallthrough
      case userlvls.streamer:
        if (typeof badges.broadcaster !== 'undefined')
          return true
        // Fallthrough
      case userlvls.master:
        // Handled above
        return false
      default:
        console.warn(`Unknown permission level: ${alias.userlvl}`)
        return true
    }
  }

  /** Determine the remaining cooldown of `alias` in `channelId` for `userId` */
  public getCooldown(channelId: number, userId: number, alias: DefaultCommandAlias): number {
    const cooldowns = this.data.getData(channelId, 'cooldowns') as CooldownData
    if (!cooldowns)
      return 0

    let cd = 0,
        ucd = 0
    const now = Date.now()
    if (alias.cooldown) {
      if (typeof cooldowns.shared[alias.target] !== 'object')
        cooldowns.shared[alias.target] = []
      cd = next(cooldowns.shared[alias.target], alias.cooldown)
    }
    if (alias.userCooldown) {
      if (typeof cooldowns.user[alias.target] !== 'object')
        cooldowns.user[alias.target] = {}
      if (typeof cooldowns.user[alias.target][userId] !== 'object')
        cooldowns.user[alias.target][userId] = []
      ucd = next(cooldowns.user[alias.target][userId], alias.userCooldown)
    }
    return Math.max(cd, ucd)

    function next(times: number[], opts: number | {duration?: number, delay?: number, limit?: number}) {
      if (typeof opts === 'number') {
        opts = { duration: opts, delay: 0, limit: 1 }
      } else {
        if (typeof opts.delay === 'undefined')
          opts.delay = 0
        if (typeof opts.duration === 'undefined')
          opts.duration = 30000
        if (typeof opts.limit === 'undefined')
          opts.limit = 1
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
        return times.length ? (times[times.length - 1] + opts.delay!) - now : 0
      } else {
        const exceeds = times.length - opts.limit!,
              delayTest = (times[times.length - 1] + opts.delay!) - now, // test only for delay
              limitTest = (times[exceeds + 0] + duration) - now // test all but delay
        return Math.max(delayTest, limitTest)
      }
    }
  }

  public loadFromPath(path: string) {
    path = require.resolve(path)
    delete require.cache[path] // Delete cache entry

    const source: Source = require(path)

    // Check if multi plugin file
    if (Array.isArray(source))
      return source.map(source => handle.bind(this)(path, source))
    else
      return [handle.bind(this)(path, source)]


    function handle(this: Commander, path: string, plugin: {options: PluginOptions, Instance: new() => PluginInstance}) {
      const _plugin: {options: PluginOptions, Instance: new() => PluginInstance} = plugin,
            options = _plugin.options
      if (options) {
        const type = options.type // Cant use options in default case
        this.paths[options.id] = path
        this.plugins[options.id] = options
        switch (options.type) {
          case 'command':
            try {
              this.validator.cacheHelp(options.id, options.help) // !!!
            } catch (err) {
              // !!!
              console.log(`in id:${options.id}`)
              console.error(err.message)
              console.log(err.stack.split('\n')[4])
              console.log(options.help)
            }
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
        throw console.error(`Plugin lacks options export: ${path}`)
      }
    }
  }

  /** Loads `pluginId` if possible */
  public async loadPlugin(pluginId: string, timeout = 5000): Promise<AdvancedResult> {
    if (!this.paths[pluginId])
      return { success: false, code: 'MISSING', message: 'Plugin path missing. The plugin has never been loaded?' }
    this.loadFromPath(this.paths[pluginId])

    const res = await this.waitPlugin(pluginId, timeout)
    if (!res)
      return { success: false, code: 'TIMEOUT', message: 'Plugin wait timeout. The plugin may still finish loading later' }
    return { success: true }
  }

  /** Reloads `pluginId` if possible */
  public async reloadPlugin(pluginId: string): Promise<AdvancedResult> {
    const unloadRes = await this.unloadPlugin(pluginId, 5000)
    if (!unloadRes.success)
      return unloadRes
    return this.loadPlugin(pluginId)
  }

  /** Unloads `pluginId` if possible */
  public async unloadPlugin(pluginId: string, timeout?: number): Promise<AdvancedResult> {
    if (!this.paths[pluginId])
      return { success: false, code: 'MISSING', message: 'Plugin path missing. The plugin has never been loaded?' }

    if (this.plugins[pluginId].noUnload)
      return { success: false, code: 'UNSUPPORTED', message: 'Plugin explicitly does not support unloading' }


    const res = await this.waitPlugin(pluginId, timeout) // Plugin must be loaded before unloading
    if (!res) {
      if (typeof timeout === 'number')
        return { success: false, code: 'TIMEOUT', message: 'Plugin wait timeout' }
      else
        return { success: false, code: 'UNLOADED', message: 'Plugin is not loaded' }
    }

    const creates = this.plugins[pluginId].creates,
          reqPlugin: string[] = [],
          reqData: string[] = []
    // Check that other plugins dont require parts of this plugin
    for (const pid in this.plugins) {
      // Test if this plugin is vital
      if ((this.plugins[pid].requirePlugins || []).includes(pluginId))
        reqPlugin.push(pid)

      // Test if this plugin's created data is vital
      if (creates) {
        for (const create of creates) {
          const createString = create.join('/')
          for (const require of (this.plugins[pid].requireDatas || [])) {
            const requireString = require.join('/')
            if (createString === requireString)
              reqData.push(pid)
          }
        }
      }
    }

    util.uniquify(reqPlugin, true)
    util.uniquify(reqData, true)
    if (reqPlugin.length && reqData.length)
      return { success: false, code: 'REQUIRED', message: `Other plugins require this plugin (${reqPlugin.join(', ')}) and data created by this plugin (${reqData.join(', ')})` }
    else if (reqPlugin.length)
      return { success: false, code: 'REQUIREDPLUGIN', message: `Other plugins require this plugin (${reqPlugin.join(', ')})` }
    else if (reqData.length)
      return { success: false, code: 'REQUIREDDATA', message: `Other plugins require data created by this plugin (${reqData.join(', ')})` }


    if (this.instances[pluginId].unload)
      await this.instances[pluginId].unload!()

    // Disable default aliases
    for (const name in this.defaultAliases) {
      if (this.defaultAliases[name].target === pluginId)
        delete this.defaultAliases[name]
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
    if (atUser)
      return false
    message = message.toLowerCase()
    if (message.length > 200)
      return false
    if (message.includes(irc.user))
      return false
    if (message.includes(irc.tags['display-name'].toLowerCase()))
      return false
    return true
  }

  /** Returns the @user string */
  public getAtUser(display: string): string {
    return `@${display} `
  }

  /** Resolves with true when plugin is loaded or with false on timeout */
  public waitPlugin(pluginId: string, timeout?: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.instances[pluginId])
        return resolve(true)
      if (this.waits[pluginId])
        this.waits[pluginId].push(resolve)
      else
        this.waits[pluginId] = [resolve]
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
    if (!this.waits[pluginId] || !this.waits[pluginId].length)
      return false
    this.waits[pluginId].forEach(resolveWait => resolveWait(true))
    this.waits[pluginId] = []
    return true
  }

  private async instantiatePlugin(options: PluginOptions, Instantiator: new(pluginLib: PluginLibrary) => PluginInstance) {
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
    if (options.requirePlugins)
      await Promise.all(options.requirePlugins.map(id => this.waitPlugin(id)))

    const instance = new Instantiator(this.pluginLib)
    if (typeof instance.init === 'function')
      await instance.init()
    // console.log(`Instantiated ${options.id}`)
    this.instances[options.id] = instance
    this.resolveWaits(options.id)
    if (options.type === 'command' && typeof this.instances[options.id].call !== 'function')
      throw new Error(`Invalid call function on command plugin instance: ${this.plugins[options.id].id}`)
  }

  private async onMod(channelId: number, login: string, mod: boolean) {
    // Remove moderators from blacklists
    if (!mod)
      return

    const userId = await this.client.api.getId(login, true)
    if (!userId)
      return

    const aliases = this.getAliases(channelId)
    if (!aliases)
      return
    for (const name in aliases) {
      if (aliases[name].blacklist) {
        const newList = aliases[name].blacklist!.filter(v => v !== userId)
        this.modAlias(channelId, name, { blacklist: newList })
      }
    }
  }

  private async onChat(channelId: number, userId: number, tags: PRIVMSG['tags'], message: string, me: boolean, self: boolean, irc: PRIVMSG | null) {
    if (self)
      return // Bot shouldn't trigger commands
    if (irc === null)
      return

    let params = message.split(' ')
    const alias = this.getAlias(channelId, params[0])
    if (!alias || alias.disabled)
      return

    const instance = this.instances[alias.target],
          plugin = this.plugins[alias.target]
    if (plugin.type !== 'command')
      return console.log(`Trying to call a non command: ${alias.target}`)
    if (!plugin.unignoreMentions)
      message = message.replace(/ @.*/, '') // Remove @user... from command calls
    params = message.split(' ')
    // Make sure the plugin is loaded
    if (!instance)
      return console.log(`Cannot call unloaded command: ${alias.target}`)
    if (!this.plugins[alias.target])
      return console.log(`Alias has an unknown target id ${alias.target}`)
    if (!instance.call)
      throw new Error(`No call function on command plugin: ${alias.target}`)
    // Check permissions (master users always have permissions)
    if (this.isPermitted(alias, userId, tags.badges)) {
      if (this.masters.includes(userId) || (tags.badges && (tags.badges.broadcaster || tags.badges.moderator))) {
        // Master users, mods and the broadcaster don't care about cooldowns
        const validation = await this.validator.validate(channelId, plugin.id, alias.group || 'default', params.slice(1))
        if (!validation.pass)
          return this.client.chat(channelId, `${await addUser.bind(this)(plugin.disableMention, validation.message, irc)}${validation.message}`)


        const res = await instance.call(channelId, userId, tags, params, { alias, message, me, cooldown: 0, irc })
        if (res)
          this.client.chat(channelId, `${await addUser.bind(this)(plugin.disableMention, res, irc)}${res}`)
      } else {
        const cooldown = this.getCooldown(channelId, userId, alias)
        if (cooldown <= 0) { // Passing
          const cooldowns = this.data.getData(channelId, 'cooldowns') as CooldownData
          if (cooldowns) {
            // Add entries to cooldowns
            if (alias.cooldown)
              cooldowns.shared[alias.target].push(Date.now())
            if (alias.userCooldown && alias.userCooldown > (alias.cooldown || 0))
              cooldowns.user[alias.target][userId].push(Date.now())
          }

          const validation = await this.validator.validate(channelId, plugin.id, alias.group || 'default', params.slice(1))
          if (!validation.pass)
            return this.client.chat(channelId, `${await addUser.bind(this)(plugin.disableMention, validation.message, irc)}${validation.message}`)


          const res = await instance.call(channelId, userId, tags, params, { alias, message, me, cooldown, irc })
          if (res)
            this.client.chat(channelId, `${await addUser.bind(this)(plugin.disableMention, res, irc)}${res}`)
        } else if (instance.cooldown) { // On cooldown
          instance.cooldown(channelId, userId, tags, params, { alias, message, me, cooldown, irc })
        }
      }
    }
    async function addUser(this: Commander, atUser: true | undefined, message: string, irc: PRIVMSG): Promise<string> {
      return this.shouldAtUser(atUser, message, irc) ? `${this.getAtUser(await this.client.api.getDisplay(userId) || 'Unknown')} ` : ''
    }
  }
}
