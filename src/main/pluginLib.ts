import TwitchClient from './client/Client'
import Commander, { CommandAlias, PluginInstance, PluginOptions } from './Commander'
import Data from './Data'
import * as secretKey from './lib/secretKey'
import * as util from './lib/util'

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
    prependOnceListener: TwitchClient['prependOnceListener'],
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

  /** Create a command alias in `channelId` */
  public createAlias: Commander['createAlias']
  /** Delete a command alias in `channelId` */
  public deleteAlias: Commander['deleteAlias']
  /** Return alias of `channelId` */
  public getAlias: Commander['getAlias']
  /** Return global alias */
  public getGlobalAlias: Commander['getGlobalAlias']
  /** Returns all aliases of `channelId` */
  public getAliases: Commander['getAliases']
  /** Returns all global aliases */
  public getGlobalAliases: Commander['getGlobalAliases']
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
    this.waitData = this.data.waitData.bind(this.data)
    this.setData = this.data.setData.bind(this.data)
    this.autoLoad = this.data.autoLoad.bind(this.data)
    this.load = this.data.load.bind(this.data)
    this.reload = this.data.reload.bind(this.data)
    this.saveData = this.data.save.bind(this.data)
    this.saveAllSync = this.data.saveAllSync.bind(this.data)

    this.chat = this.client.chat.bind(this.client)
    this.whisper = this.client.whisper.bind(this.client)
    this.join = this.client.join.bind(this.client)
    this.part = this.client.part.bind(this.client)

    this.createAlias = this.commander.createAlias.bind(this.commander)
    this.deleteAlias = this.commander.deleteAlias.bind(this.commander)
    this.getAlias = this.commander.getAlias.bind(this.commander)
    this.getGlobalAlias = this.commander.getGlobalAlias.bind(this.commander)
    this.getAliases = this.commander.getAliases.bind(this.commander)
    this.getGlobalAliases = this.commander.getGlobalAliases.bind(this.commander)
    this.isPermitted = this.commander.isPermitted.bind(this.commander)
    this.getCooldown = this.commander.getCooldown.bind(this.commander)
    this.reloadPlugin = this.commander.reloadPlugin.bind(this.commander)
    this.loadPlugin = this.commander.loadPlugin.bind(this.commander)
    this.unloadPlugin = this.commander.unloadPlugin.bind(this.commander)
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

  /** Throws if conflicts are found */
  public findConflicts() {
    this.commander.findConflicts(Object.values(this.commander.plugins), Object.values(this.commander.paths))
  }

  /** Loads a new plugin from ./bin/plugins/`path`.js */
  public loadFromPath(path: string) {
    this.commander.loadFromPath(`./bin/plugins/${path}.js`)
  }

  /** Enables the default aliases of `pluginId` if they are by default enabled */
  public enableDefaults(pluginId: string) {
    for (const aliasKey in this.commander.defaultAliases) {
      const alias = this.commander.defaultAliases[aliasKey]
      if (alias.target === pluginId) {
        const options = this.commander.plugins[pluginId]
        if (options.type === 'command') {
          if (!options.default.options.disabled) {
            delete alias.disabled
          }
        }
      }
    }
  }
  /** Disables the default aliases of `pluginId` */
  public disableDefaults(pluginId: string) {
    for (const alias in this.commander.defaultAliases) {
      if (this.commander.defaultAliases[alias].target === pluginId) {
        this.commander.defaultAliases[alias].disabled = true
      }
    }
  }

  /**
   * Gets a key from the config/keys.json file.  
   * `keys` is a path to a key (e.g. 'myService', 'oauth' would result in FILE.myService.oauth key value being returned)
   */
  public getKey(...keys: string[]) {
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
  public getEnabledAliases(channelId: number): {[alias: string]: CommandAlias} {
    return this._getEnabledAliases(channelId)
  }
  /** Returns active default aliases */
  public getEnabledGlobalAliases(): {[x: string]: Readonly<CommandAlias>} {
    return this._getEnabledAliases()
  }

  /** Returns active aliases of `channelId` */
  private _getEnabledAliases(channelId: number): {[alias: string]: CommandAlias}
  /** Returns active default aliases */
  private _getEnabledAliases(): {[x: string]: Readonly<CommandAlias>}
  /** Returns active default aliases or active aliases of `channelId` */
  private _getEnabledAliases(channelId?: number): {[alias: string]: CommandAlias} {
    const result: { [alias: string]: CommandAlias; } = {}
    if (channelId) {
      // Channel aliases
      for (const alias in this.data.data[channelId].aliases) {
        if (this.data.data[channelId].aliases[alias].disabled) continue
        // Channel aliases may and should overwrite default aliases here
        result[alias] = this.data.data[channelId].aliases[alias]
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
