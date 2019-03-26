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

    this.on = client.on
    this.once = client.once
    this.removeListener = client.removeListener
    this.prependListener = client.prependListener
    this.prependOnceListener = client.prependOnceListener

    this.getData = this.data.getData
    this.waitData = this.data.waitData
    this.autoLoad = this.data.autoLoad

    this.chat = this.client.chat
    this.whisper = this.client.whisper
    this.join = this.client.join
    this.part = this.client.part

    this.createAlias = this.commander.createAlias
    this.deleteAlias = this.commander.deleteAlias
    this.enableAlias = this.commander.enableAlias
    this.disableAlias = this.commander.disableAlias

  }

  /** Websocket is ready */
  public get connected() {
    return this.client.ws ? this.client.ws.readyState === 1 : false
  }

  /** Returns the active command alias options or undefined if the alias doesn't exist */
  public getActiveAlias(channel: string, word: string): CommandAlias | void  {
    return this.commander.getActiveAlias(channel, word)
  }
  /** Returns the command alias options or undefined if the alias doesn't exist */
  public getAlias(channel: string, word: string): CommandAlias | void {
    if (((this.data.static[channel] || {}).aliases || {})[word]) {
      return this.data.static[channel].aliases[word]
    } else if (this.commander.defaults[word]) return this.commander.defaults[word]
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
