import Commander, { CommandAlias, PluginInstance, PluginOptions } from './Commander'
import Data from './Data'
import TwitchClient from './lib/Client'

export default class PluginLibrary {
  /**
   * Returns the data or undefined if it isn't loaded.  
   * Data will be an object and therefore a reference, so keep that it mind. The undefined value is not a reference
   */
  public getData: Data['getData']
  /** Wait until the data is loaded. Resolves with the arguments the event gives or undefined if timedout */
  public waitData: Data['waitData']
  /** Loads specified data type for each joined channel and unloads when a channel is parted */
  public autoLoad: Data['autoLoad']

  /** Send `message` to `channel` */
  public chat: TwitchClient['chat']
  /** Send `message` to `user` */
  public whisper: TwitchClient['whisper']
  /** Join `channel` */
  public join: TwitchClient['join']
  /** Part `channel` */
  public part: TwitchClient['part']

  /** Create command alias */
  public createAlias: Commander['createAlias']
  /** Delete command alias */
  public deleteAlias: Commander['deleteAlias']
  /** Enable command alias */
  public enableAlias: Commander['enableAlias']
  /** Disable command alias */
  public disableAlias: Commander['disableAlias']
  /** Return active alias */
  public getActiveAlias: Commander['getActiveAlias']

  public on: TwitchClient['on']
  public once: TwitchClient['once']
  public removeListener: TwitchClient['removeListener']
  public prependListener: TwitchClient['prependListener']
  public prependOnceListener: TwitchClient['prependOnceListener']

  private commander: Commander
  private data: Data
  private client: TwitchClient

  constructor(client: TwitchClient, data: Data, commander: Commander) {
    this.commander = commander
    this.data = data
    this.client = client

    this.on = client.on.bind(this.client)
    this.once = client.once.bind(this.client)
    this.removeListener = client.removeListener.bind(this.client)
    this.prependListener = client.prependListener.bind(this.client)
    this.prependOnceListener = client.prependOnceListener.bind(this.client)

    this.getData = this.data.getData.bind(this.data)
    this.waitData = this.data.waitData.bind(this.data)
    this.autoLoad = this.data.autoLoad.bind(this.data)

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

  /** Websocket is ready */
  public connected() {
    return this.client.ws ? this.client.ws.readyState === 1 : false
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
