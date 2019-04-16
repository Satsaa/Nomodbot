import TwitchClient from './client/Client'
import Commander, { CommandAlias, PluginInstance, PluginOptions } from './Commander'
import Data from './Data'
import * as secretKey from './lib/secretKey'
import * as util from './lib/util'

export default class PluginLibrary {

  /** util library */
  public readonly u: typeof util
  /** Libaries shared by plugins */
  public readonly ext: {[commandId: string]: {[x: string]: any}}

  public readonly emitter: {
    readonly on: TwitchClient['on']
    readonly once: TwitchClient['once']
    readonly removeListener: TwitchClient['removeListener']
    readonly prependListener: TwitchClient['prependListener']
    readonly prependOnceListener: TwitchClient['prependOnceListener'],
  }
  public readonly api: TwitchClient['api']

  /**
   * Returns the path to the file where the specified data is stored
   */
  public readonly getPath: Data['getPath']
  /**
   * Returns the data or undefined if it isn't loaded.  
   * Data will be an object and therefore a reference, so changes to that object will change it for others  
   * The undefined value is not a reference
   */
  public readonly getData: Data['getData']
  /** Wait until the data is loaded. Resolves with the data or undefined if timedout */
  public readonly waitData: Data['waitData']
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
  public readonly setData: Data['setData']
  public readonly autoLoad: Data['autoLoad']
  /**
   * Loads a file in `Data.dataPath`/`subType`/`name`
   * @param subType E.g. 'default', 'global'. Use autoLoad for channel specific data.
   * @param name File name
   * @param defaultData If the file doesn't exist, create it with this data
   * @param setDefaults Sets all undefined keys in the returned data that exist in `defaultData` to the value of `defaultData`
   */
  public readonly load: Data['load']
  /**
   * Reloads a file in `Data.dataPath`/`subType`/`name`
   * @param subType E.g. 'default', 'global'.
   * @param name File name
   * @param save Save before reloading
   */
  public readonly reload: Data['reload']
  /**
   * Saves a file in `Data.dataPath`/`subType`/`name`
   * @param subType E.g. 'default', 'global'
   * @param name File name
   * @param unload Unload from memory if save is succesful
   */
  public readonly saveData: Data['save']
  /** Saves all loaded data types synchronously */
  public readonly saveAllSync: Data['saveAllSync']

  /** Whisper `msg` to `channel` */
  public readonly chat: TwitchClient['chat']
  /** Whisper `msg` to `user` */
  public readonly whisper: TwitchClient['whisper']
  /** Join `channels` */
  public readonly join: TwitchClient['join']
  /** Leave `channels` */
  public readonly part: TwitchClient['part']

  /** Create command alias */
  public readonly createAlias: Commander['createAlias']
  /** Delete command alias */
  public readonly deleteAlias: Commander['deleteAlias']
  /** Enable command alias */
  public readonly enableAlias: Commander['enableAlias']
  /** Disable command alias */
  public readonly disableAlias: Commander['disableAlias']
  /** Return active alias */
  public readonly getActiveAlias: Commander['getActiveAlias']
  /** Determine if a user with `badges` would be permitted to call this command */
  public readonly isPermitted: Commander['isPermitted']

  private readonly commander: Commander
  private readonly data: Data
  private readonly client: TwitchClient

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
    this.enableAlias = this.commander.enableAlias.bind(this.commander)
    this.disableAlias = this.commander.disableAlias.bind(this.commander)
    this.getActiveAlias = this.commander.getActiveAlias.bind(this.commander)
    this.isPermitted = this.commander.isPermitted.bind(this.commander)

  }

  /** Maximum message length for chat */
  public get maxMsgLength() {
    return this.client.opts.maxMsgLength - this.dupeAffix.length
  }

  /** String used to avoid duplicate messages */
  public get dupeAffix() {
    return this.client.opts.dupeAffix
  }

  /** Websocket is ready */
  public connected() {
    return this.client.ws ? this.client.ws.readyState === 1 : false
  }

  /** Add keys to pluginLib.ext[pluginId] */
  public extend(pluginId: string, method: string, value: any): void
  /** Set the pluginLib.ext[pluginId] key */
  public extend(pluginId: string, value: {[key: string]: any}): void

  public extend(pluginId: string, method: string | {[key: string]: any}, value?: any) {
    if (typeof method === 'object') {
      this.ext[pluginId] = method
    } else {
      if (!this.ext[pluginId]) this.ext[pluginId] = {}
      this.ext[pluginId][method] = value
    }
  }

  /** Disables the default aliases of `pluginId` */
  public disableDefaults(pluginId: string) {
    const aliases = this.getAliases()
    for (const alias in aliases) if (aliases[alias].id === pluginId) delete aliases[alias].disabled
  }
  /** Enables the default aliases of `pluginId` */
  public enableDefaults(pluginId: string) {
    const aliases = this.getAliases()
    for (const alias in aliases) if (aliases[alias].id === pluginId) aliases[alias].disabled = true
  }
  /**
   * Gets a key from the config/keys.json file.  
   * `keys` is a path to a key (e.g. 'myService', 'oauth' would result in FILE.myService.oauth key value being returned)
   */
  public getKey(...keys: string[]) {
    return secretKey.getKey('./main/cfg/keys.json', ...keys)
  }

  /** Returns the emotes in `message` as strings */
  public getEmotes(emotes: {[emote: string]: {start: number, end: number}}, message: string): string[] {
    const res = []
    for (const emote in emotes) {
      res.push(message.slice(emotes[emote].start, emotes[emote].end + 1))
    }
    return res
  }

  /** Returns the command alias options or undefined if the alias doesn't exist */
  public getAlias(channel: string, word: string): CommandAlias | void {
    if (((this.data.data[channel] || {}).aliases || {})[word]) {
      return this.data.data[channel].aliases[word]
    } else if (this.commander.defaults[word]) return this.commander.defaults[word]
  }
  /** Returns default aliases or aliases of a channel */
  public getAliases(channel?: string): { [x: string]: CommandAlias; } {
    if (channel)  return this.data.data[channel].aliases
    else return this.commander.defaults
  }
  /** Returns active default aliases or active aliases of a channel  */
  public getActiveAliases(channelId?: number): { [x: string]: CommandAlias; } {
    const aliases: { [x: string]: CommandAlias; } = {}
    // Default aliases
    for (const alias in this.commander.defaults) {
      if (this.commander.defaults[alias].disabled) continue
      aliases[alias] = this.commander.defaults[alias]
    }
    if (channelId) {
      // Channel aliases
      for (const alias in this.data.data[channelId].aliases) {
        if (this.data.data[channelId].aliases[alias].disabled) continue
        aliases[alias] = this.data.data[channelId].aliases[alias]
      }
    }
    return aliases
  }
  /** Returns the instance of a plugin or undefined if it doesn't exist */
  public getInstance(pluginId: string): PluginInstance | undefined {
    return this.commander.instances[pluginId]
  }
  /** Returns the options export of a plugin or undefined if the plugin doesn't exist */
  public getPlugin(pluginId: string): PluginOptions | undefined {
    return this.commander.plugins[pluginId]
  }
}
