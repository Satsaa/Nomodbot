import Commander from './Commander'
import Data from './Data'
import TwitchClient from './lib/Client'

export default class PluginLibrary {
  public getData: (type: 'static' | 'dynamic', subType: string, name: string) => { [x: string]: any; } | undefined
  public waitData: (type: 'static' | 'dynamic', subType: string, name: string, timeout?: number | undefined) => Promise<object | undefined>
  private commander: Commander
  private data: Data
  private client: TwitchClient

  private on: TwitchClient['on']
  private once: TwitchClient['once']
  private removeListener: TwitchClient['removeListener']
  private prependListener: TwitchClient['prependListener']
  private prependOnceListener: TwitchClient['prependOnceListener']

  constructor(client: TwitchClient, data: Data, commander: Commander) {
    this.commander = commander
    this.data = data
    this.client = client

    this.on = client.on
    this.once = client.once
    this.removeListener = client.removeListener
    this.prependListener = client.prependListener
    this.prependOnceListener = client.prependOnceListener

   /**
    * Returns the data or undefined if it isn't loaded.  
    * Data will be an object and therefore a reference, so keep that it mind. The undefined value is not a reference
    */
    this.getData = this.data.getData

    /** Wait until the data is loaded. Resolves with the arguments the event gives or undefined if timedout */
    this.waitData = this.data.waitData
  }

  /** Websocket is ready? May not be */
  public get connected() {
    return this.client.ws ? this.client.ws.readyState === 1 : false
  }

  /** Send `message` to `channel` */
  public chat(channel: string, message: string, command = false) {
    this.client.chat(channel, message, command)
  }
  /** Send `message` to `user` */
  public whisper(user: string, message: string) {
    this.client.whisper(user, message)
  }
  /** Join `channel` */
  public join(channel: string) {
    this.client.join(channel)
  }
  /** Part `channel` */
  public part(channel: string) {
    this.client.part(channel)
  }

}
