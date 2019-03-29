import Commander, { CommandAlias, PluginInstance, PluginOptions } from './Commander'
import Data, { DATATYPES } from './Data'
import TwitchClient from './lib/Client'
import * as secretKey from './lib/secretKey'
import * as util from './lib/util'

export default class PluginLibrary {
  /**
   * Returns the data or undefined if it isn't loaded.  
   * Data will be an object and therefore a reference, so keep that it mind. The undefined value is not a reference
   */
  public readonly getData: Data['getData']
  /** Wait until the data is loaded. Resolves with the arguments the event gives or undefined if timedout */
  public readonly waitData: Data['waitData']
  /** Loads the specified data type for each joined channel and unloads when a channel is parted */
  public readonly autoLoad: Data['autoLoad']
  /** Loads the specified data type */
  public readonly load: Data['load']
  /** Reloads the specified data type without saving it */
  public readonly reload: Data['reload']
  /** Saves the specified data type and optionally unloads it */
  public readonly save: Data['save']

  /** Send `message` to `channel` */
  public readonly chat: TwitchClient['chat']
  /** Send `message` to `user` */
  public readonly whisper: TwitchClient['whisper']
  /** Join `channel` */
  public readonly join: TwitchClient['join']
  /** Part `channel` */
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

  public emitter: {
    readonly on: TwitchClient['on']
    readonly once: TwitchClient['once']
    readonly removeListener: TwitchClient['removeListener']
    readonly prependListener: TwitchClient['prependListener']
    readonly prependOnceListener: TwitchClient['prependOnceListener'],
  }

  /** util lib */
  public u: typeof util
  /** Plugins can define keys to this object. Other plugins can then use them. Use `requires` option to make sure the properties are ready for use */
  public extend: {[x: string]: any}

  public readonly DATATYPES: typeof DATATYPES

  private readonly commander: Commander
  private readonly data: Data
  private readonly client: TwitchClient

  constructor(client: TwitchClient, data: Data, commander: Commander) {
    this.commander = commander
    this.data = data
    this.client = client

    this.u = util
    this.extend = {}

    this.DATATYPES = DATATYPES

    this.emitter = {
      on: client.on.bind(this.client),
      once: client.once.bind(this.client),
      removeListener: client.removeListener.bind(this.client),
      prependListener: client.prependListener.bind(this.client),
      prependOnceListener: client.prependOnceListener.bind(this.client),
    }

    this.getData = this.data.getData.bind(this.data)
    this.waitData = this.data.waitData.bind(this.data)
    this.autoLoad = this.data.autoLoad.bind(this.data)
    this.load = this.data.load.bind(this.data)
    this.reload = this.data.reload.bind(this.data)
    this.save = this.data.save.bind(this.data)

    this.chat = this.client.chat.bind(this.client)
    this.whisper = this.client.whisper.bind(this.client)
    this.join = this.client.join.bind(this.client)
    this.part = this.client.part.bind(this.client)

    this.createAlias = this.commander.createAlias.bind(this.commander)
    this.deleteAlias = this.commander.deleteAlias.bind(this.commander)
    this.enableAlias = this.commander.enableAlias.bind(this.commander)
    this.disableAlias = this.commander.disableAlias.bind(this.commander)
    this.getActiveAlias = this.commander.getActiveAlias.bind(this.commander)

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

  /** Gets a key from the config\keys.json file */
  public getKeys(arg: any) {

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
    if (((this.data.static[channel] || {}).aliases || {})[word]) {
      return this.data.static[channel].aliases[word]
    } else if (this.commander.defaults[word]) return this.commander.defaults[word]
  }
  /** Returns default aliases or aliases of a channel */
  public getAliases(channel?: string): { [x: string]: CommandAlias; } {
    if (channel)  return this.data.static[channel].aliases
    else return this.commander.defaults
  }
  /** Returns active default aliases or active aliases of a channel  */
  public getActiveAliases(channel?: string): { [x: string]: CommandAlias; } {
    const aliases: { [x: string]: CommandAlias; } = {}
    // Default aliases
    for (const alias in this.commander.defaults) {
      if (this.commander.defaults[alias].disabled) continue
      aliases[alias] = this.commander.defaults[alias]
    }
    if (channel) {
      // Channel aliases
      for (const alias in this.data.static[channel].aliases) {
        if (this.data.static[channel].aliases[alias].disabled) continue
        aliases[alias] = this.data.static[channel].aliases[alias]
      }
    }
    return aliases
  }
  /** Returns the instance of a plugin or undefined if it doesn't exist */
  public getInstance(pluginID: string): PluginInstance | undefined {
    return this.commander.instances[pluginID]
  }
  /** Returns the options export of a plugin or undefined if the plugin doesn't exist */
  public getPlugin(pluginID: string): PluginOptions | undefined {
    return this.commander.plugins[pluginID]
  }
}
