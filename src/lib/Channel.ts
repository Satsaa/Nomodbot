import TwitchClient from './Client'

/**
 * Stores channel specific methods and data
 */
export default class Channel {
  public channel: string
  public data: {}
  public active: boolean
  private client: TwitchClient
  /**
   * Channel instance
   * @param client Twitch client instance
   * @param channel Channel name
   */
  constructor(client: any, channel: string) {
    this.client = client
    this.channel = channel
    this.data = {}
    this.active = true
  }
  public join() { return this.client.join(this.channel) }
  public part() { return this.client.part(this.channel) }
  public privMsg(msg: string) { return this.client.privMsg(this.channel, msg) }
}
