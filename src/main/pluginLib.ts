import TwitchClient from './client/client'
import Commander, { CommandAlias, Extra, PluginInstance, PluginOptions, userlvls, Handlers, ReadonlyCommandAlias } from './commander'
import Data from './data'
import * as secretKey from './lib/secretKey'
import * as util from './lib/util'
import logger from './logger'

export default class PluginLibrary {
  /** util library */
  public u: typeof util
  /** Libaries shared by plugins */
  public ext: {[commandId: string]: {[x: string]: any}}

  public emitter: {
    on: TwitchClient['on']
    once: TwitchClient['once']
    removeListener: TwitchClient['removeListener']
    prependListener: TwitchClient['prependListener']
    prependOnceListener: TwitchClient['prependOnceListener']
  }
  public api: TwitchClient['api']

  /**
   * Returns the path to the file where the specified data is stored
   */
  public getPath: Data['getPath']
  /**
   * Returns the data or undefined if it isn't loaded.  
   * Data will be an object and therefore a reference, so changes to that object will change it for others  
   * The undefined value is not a reference
   */
  public getData: Data['getData']
  /** Wait until the data is loaded. Resolves with the data or undefined if timedout */
  public waitData: Data['waitData']
  /**
   * Loads or unloads specified data for each channel when the bot joins or parts one  
   * Also loads for each channel that the bot has already joined
   * @param name File name
   * @param defaultData If the file doesn't exist, create it with this data
   * @param setKeys Define all keys of the loaded data that exist in `defaultData` with the default value
   */
  /**
   * Returns the path to the file where the specified data is stored
   */
  public setData: Data['setData']
  public autoLoad: Data['autoLoad']
  /**
   * Loads a file in `Data.dataPath`/`subType`/`name`
   * @param subType E.g. 'default', 'global'. Use autoLoad for channel specific data.
   * @param name File name
   * @param defaultData If the file doesn't exist, create it with this data
   * @param setDefaults Sets all undefined keys in the returned data that exist in `defaultData` to the value of `defaultData`
   */
  public load: Data['load']
  /**
   * Reloads a file in `Data.dataPath`/`subType`/`name`
   * @param subType E.g. 'default', 'global'.
   * @param name File name
   * @param save Save before reloading
   */
  public reload: Data['reload']
  /**
   * Saves a file in `Data.dataPath`/`subType`/`name`
   * @param subType E.g. 'default', 'global'
   * @param name File name
   * @param unload Unload from memory if save is succesful
   */
  public saveData: Data['save']
  /** Saves all loaded data types synchronously */
  public saveAllSync: Data['saveAllSync']

  /** Whisper `msg` to `channelId` */
  public chat: TwitchClient['chat']
  /** Whisper `msg` to `userId` */
  public whisper: TwitchClient['whisper']
  /** Join `channelIds` */
  public join: TwitchClient['join']
  /** Leave `channelIds` */
  public part: TwitchClient['part']

  /**
   * Create or overwrite a command alias in `channelId`  
   * @returns Created alias
   */
  public setAlias: Commander['setAlias']
  /** Return alias of `channelId` */
  public getAlias: Commander['getAlias']
  /** Merge `options` to an existing alias of `channelId` */
  public modAlias: Commander['modAlias']
  /** Delete a command alias in `channelId` */
  public delAlias: Commander['delAlias']
  /** Returns all aliases of `channelId` */
  public getAliases: Commander['getAliases']
  /** Returns all aliases of `pluginId` of `channelId` */
  public getAliasesById: Commander['getAliasesById']
  /** Determine if `userId` with `badges` would be permitted to call this command */
  public isPermitted: Commander['isPermitted']
  /** Determine the remaining cooldown of `alias` in `channelId` for `userId` */
  public getCooldown: Commander['getCooldown']
  /** Reloads `pluginId` if possible */
  public reloadPlugin: Commander['reloadPlugin']
  /** Loads `pluginId` if possible */
  public loadPlugin: Commander['loadPlugin']
  /** Unloads `pluginId` if possible */
  public unloadPlugin: Commander['unloadPlugin']
  /** Wait until `pluginId` is loaded */
  public waitPlugin: Commander['waitPlugin']

  private commander: Commander
  private data: Data
  private client: TwitchClient

  constructor(client: TwitchClient, data: Data, commander: Commander) {
    this.commander = commander
    this.data = data
    this.client = client

    // Public

    this.u = util
    this.ext = {}

    this.emitter = {
      on: client.on.bind(this.client),
      once: client.once.bind(this.client),
      removeListener: client.removeListener.bind(this.client),
      prependListener: client.prependListener.bind(this.client),
      prependOnceListener: client.prependOnceListener.bind(this.client),
    }
    this.api = this.client.api

    this.getPath = this.data.getPath.bind(this.data)
    this.getData = this.data.getData.bind(this.data)
    this.setData = this.data.setData.bind(this.data)
    this.waitData = this.data.waitData.bind(this.data)
    this.autoLoad = this.data.autoLoad.bind(this.data)
    this.load = this.data.load.bind(this.data)
    this.reload = this.data.reload.bind(this.data)
    this.saveData = this.data.save.bind(this.data)
    this.saveAllSync = this.data.saveAllSync.bind(this.data)

    this.chat = this.client.chat.bind(this.client)
    this.whisper = this.client.whisper.bind(this.client)
    this.join = this.client.join.bind(this.client)
    this.part = this.client.part.bind(this.client)

    this.setAlias = this.commander.setAlias.bind(this.commander)
    this.getAlias = this.commander.getAlias.bind(this.commander)
    this.modAlias = this.commander.modAlias.bind(this.commander)
    this.delAlias = this.commander.delAlias.bind(this.commander)
    this.getAliases = this.commander.getAliases.bind(this.commander)
    this.getAliasesById = this.commander.getAliasesById.bind(this.commander)
    this.isPermitted = this.commander.isPermitted.bind(this.commander)
    this.getCooldown = this.commander.getCooldown.bind(this.commander)
    this.reloadPlugin = this.commander.reloadPlugin.bind(this.commander)
    this.loadPlugin = this.commander.loadPlugin.bind(this.commander)
    this.unloadPlugin = this.commander.unloadPlugin.bind(this.commander)
    this.waitPlugin = this.commander.waitPlugin.bind(this.commander)
  }

  /** Maximum message length for chat */
  public get maxMsgLength() {
    return this.client.opts.maxMsgLength - this.dupeAffix.length
  }

  /** String used to avoid duplicate messages */
  public get dupeAffix() {
    return this.client.opts.dupeAffix
  }

  /** The list of joined channelsIds */
  public get joinedChannels() {
    return this.client.joinedChannels
  }

  /** Websocket is ready */
  public get connected() {
    return this.client.ws ? this.client.ws.readyState === 1 : false
  }

  /** Set pluginLib.ext[pluginId][sub] */
  public extend(pluginId: string, sub: string, value: any): void
  /** Set pluginLib.ext[pluginId] */
  public extend(pluginId: string, value: {[key: string]: any}): void
  /** Extend pluginLib.ext */
  public extend(pluginId: string, sub: string | {[key: string]: any}, value?: any) {
    if (typeof sub === 'object') {
      this.ext[pluginId] = sub
    } else {
      if (!this.ext[pluginId]) this.ext[pluginId] = {}
      this.ext[pluginId][sub] = value
    }
  }

  /** Deletes an extension */
  public unextend(pluginId: string, sub?: string) {
    if (sub) {
      if (typeof this.ext[pluginId] === 'object') delete this.ext[pluginId][sub]
    } else {
      delete this.ext[pluginId]
    }
  }

  public addHandlers(self: PluginInstance, handler: undefined, group: 'default', params: string, callHandler: Handlers['call'][string][number]['handler'], cdHandler?: Handlers['cd'][string][number]['handler']): Handlers
  public addHandlers(self: PluginInstance, handler: Handlers | undefined, group: string, params: string, callHandler: Handlers['call'][string][number]['handler'], cdHandler?: Handlers['cd'][string][number]['handler']): Handlers
  /**
   * Adds `callHandler` for `group` to `handler` and returns it.
   * The callHandler is called when a user calls the alias with matching `params`.
   * If defined the `cdHandler`  is called when the alias was on cooldown.
   * `callHandler` is bound to `self`.
   */
  public addHandlers(self: PluginInstance, handler: PluginInstance['handlers'], group: string, params: string, callHandler: Handlers['call'][string][number]['handler'], cdHandler?: Handlers['cd'][string][number]['handler']): Handlers {
    if (handler) {
      if (!handler.call[group]) handler.call[group] = []
      handler.call[group].push({ params, handler: callHandler.bind(self) })
      if (!handler.cd[group]) handler.cd[group] = []
      handler.cd[group].push({ handler: cdHandler ? cdHandler.bind(self) : cdHandler })
      return handler
    } else { // initialize
      if (group !== 'default') throw new Error('The first created handler must have the \'default\' group!')

      const _handler: any = {}
      _handler.call = {}
      _handler.call[group] = [{ params, handler: callHandler.bind(self) }]
      _handler.cd = {}
      _handler.cd[group] = [{ handler: cdHandler ? cdHandler.bind(self) : cdHandler }]
      return _handler as Handlers
    }
  }

  /** 
   * @example 
   * {
   *   call: {
   *     default: Array<{
   *       params: string
   *       handler: (channelId: number, userId: number, params: any, extra: Extra) => Promise<string | void>
   *     }>
   *     [group: string]: Array<{
   *       params: string
   *       handler: (channelId: number, userId: number, params: any, extra: Extra) => Promise<string | void>
   *     }>
   *   }
   *   cd: {
   *     default: Array<{
   *       handler?: (channelId: number, userId: number, params: any, extra: Extra) => Promise<string | void>
   *     }>
   *     [group: string]: Array<{
   *       handler?: (channelId: number, userId: number, params: any, extra: Extra) => Promise<string | void>
   *     }>
   *   }
   * } 
   */

  /** Throws if conflicts are found */
  public findConflicts() {
    this.commander.findConflicts(Object.values(this.commander.plugins), Object.values(this.commander.paths))
  }

  /** Loads a new plugin from ./bin/plugins/`path`.js */
  public async loadFromPath(path: string) {
    return this.commander.loadFromPath(`../plugins/${path}.js`)
  }

  /**
   * Converts userlvl to a string
   */
  public userlvlString(userlvl: number | undefined) {
    if (userlvl) {
      switch (userlvl) {
        case userlvls.any:
          return
        case userlvls.sub:
          return 'subscriber'
        case userlvls.vip:
          return 'vip'
        case userlvls.mod:
          return 'moderator'
        case userlvls.streamer:
          return 'broadcaster'
        case userlvls.master:
          return 'master'
      }
    }
    return undefined
  }

  /** Whether or not `userId` is a master user */
  public isMaster(userId: number) {
    return this.commander.masters.includes(userId)
  }

  /** Whether or not `user` (LOGIN) SEEMS TO BE a mod in `channelId` (ID) */
  public isMod(channelId: number, user: string) {
    if (!this.client.channelCache.mods[channelId]) return false
    return Boolean(this.client.channelCache.mods[channelId][user.toLowerCase()])
  }

  /** Insert @user to `message` if needed and return it */
  public insertAtUser(message: string, extra: Extra, overrideAtUser?: true): string {
    return (this.commander.shouldAtUser(overrideAtUser, message, extra.irc) ? this.commander.getAtUser(extra.irc.user) : '') + message
  }

  /**
   * Gets a key from the config/keys.json file.  
   * `keys` is a path to a key (e.g. 'myService', 'oauth' would result in FILE.myService.oauth key value being returned)
   */
  public getKey(...keys: readonly string[]) {
    return secretKey.getKey('./cfg/keys.json', ...keys)
  }

  /** Returns the emotes in `message` as an array of emote strings */
  public getEmotes(emotes: {[emote: string]: {start: number, end: number}}, message: string): string[] {
    const res = []
    for (const emote in emotes) {
      res.push(message.slice(emotes[emote].start, emotes[emote].end + 1))
    }
    return res
  }

  /**
   * Returns mentions without '@' from `messsage`.
   */
  public getMentions(message: string): string[] {
    let currentI = 0
    const mentions = []
    let i = 0
    while (currentI < message.length) {
      if (++i > 1000) {
        logger.error(`extractMentions: string '${message}' caused an infinite loop`)
        break
      }

      const atIndex = currentI ? message.indexOf(' @', currentI) + 1 : message.indexOf('@', currentI)
      if (atIndex === (currentI ? 0 : -1)) break

      let spaceIndex = message.indexOf(' ', atIndex)
      if (spaceIndex === -1) spaceIndex = message.length

      const mention = message.slice(atIndex + 1, spaceIndex)
      if (mention.length) mentions.push(mention)

      currentI = spaceIndex
    }
    return mentions
  }

  /**
   * Returns a copy of the help strings for `alias` based on it's `target` and `help` properties
   * @param alias Command alias
   * @param fallback If enabled, help strings of the default group will be returned when `alias`' help property points to an undefined group
   */
  public getHelp(alias: DeepReadonly<CommandAlias> | CommandAlias, fallback = false): string[] | void {
    const plugin = this.getPlugin(alias.target)
    if (!plugin || plugin.type !== 'command') return
    // Ungrouped help format
    if (Array.isArray(plugin.help)) {
      if (!fallback && alias.group && alias.group !== 'default') return
      return plugin.help.map(v => v)
    }

    // Grouped/object help format
    const group = alias.group || 'default'
    if (plugin.help[group]) return plugin.help[group].map(v => v)

    if (fallback) return plugin.help.default.map(v => v)
  }

  /** Returns the instance of a plugin or undefined if it doesn't exist */
  public getInstance(pluginId: string): PluginInstance | undefined {
    return this.commander.instances[pluginId]
  }

  /** Returns the options export of a plugin or undefined if the plugin doesn't exist */
  public getPlugin(pluginId: string): PluginOptions | undefined {
    return this.commander.plugins[pluginId]
  }

  /** Returns the options exports of enabled plugins */
  public getPlugins(): PluginOptions[] {
    return Object.values(this.commander.plugins)
  }

  /** Returns active default aliases or active aliases of `channelId` */
  public getEnabledAliases(channelId: number): {[alias: string]: ReadonlyCommandAlias} {
    return this._getEnabledAliases(channelId)
  }
  /** Returns active default aliases */
  public getEnabledGlobalAliases(): {[x: string]: ReadonlyCommandAlias} {
    return this._getEnabledAliases()
  }

  /** Returns active aliases of `channelId` */
  private _getEnabledAliases(channelId: number): {[alias: string]: ReadonlyCommandAlias}
  /** Returns active default aliases */
  private _getEnabledAliases(): {[x: string]: ReadonlyCommandAlias}
  /** Returns active default aliases or active aliases of `channelId` */
  private _getEnabledAliases(channelId?: number): {[alias: string]: ReadonlyCommandAlias} {
    const result: { [alias: string]: ReadonlyCommandAlias } = {}
    if (channelId) {
      // Channel aliases
      for (const alias in this.data.data[channelId].aliases.aliases) {
        if (this.data.data[channelId].aliases.aliases[alias].disabled) continue
        // Channel aliases may and should overwrite default aliases here
        result[alias] = this.data.data[channelId].aliases.aliases[alias]
      }
    } else {
      // Default aliases
      for (const alias in this.commander.defaultAliases) {
        if (this.commander.defaultAliases[alias].disabled) continue
        result[alias] = this.commander.defaultAliases[alias]
      }
    }
    return result
  }
}
