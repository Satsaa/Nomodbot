import TwitchClient from './Client'

/**
 * Stores channel specific methods and data
 */
export default class Channel {
  public active: boolean
  public channel: string
  public roomState: {}
  // public data: {[x: string]: {[x: string]: any}}
  private client: TwitchClient
  /**
   * Channel instance
   * @param client Twitch client instance
   * @param channel Channel name
   */
  constructor(client: TwitchClient, channel: string) {
    this.client = client
    this.channel = channel
    // this.data = {}
    this.roomState = {}
    this.active = true
  }
  public join() { return this.client.join(this.channel) }
  public part() { return this.client.part(this.channel) }
  public privMsg(msg: string) { return this.client.privMsg(this.channel, msg) }
}
