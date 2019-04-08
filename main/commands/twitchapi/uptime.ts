import { PluginInstance, PluginOptions } from '../../src/Commander'
import { IrcMessage } from '../../src/lib/parser'
import PluginLibrary from '../../src/pluginLib'
import { TwitchApiExtension } from './twitchapi'

export const options: PluginOptions = {
  type: 'command',
  id: 'uptime',
  name: 'Uptime',
  description: 'Tells how long a channel has been live or offline',
  default: {
    alias: '?uptime',
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  requires: [['global', 'twitchApi']],
  requiresPlugins: ['twitchapi'],
  help: ['Tell how long {channel} has been live or offline: {alias}'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary
  private api: TwitchApiExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.api = this.l.ext.twitchapi as TwitchApiExtension
  }

  public async call(channel: string, user: string, userstate: IrcMessage['tags'], message: string, params: string[], me: boolean) {
    const channelId = await this.api.getId(channel)
    if (!channelId) return 'Cannot resolve channel id'

    const stream = await this.api._streams({user_id: channelId, first: 3})
    if (typeof stream !== 'object') return 'Cannot resolve current stream'

    if (stream.data.length > 0) { // Live
      const startTime = new Date(stream.data[0].started_at).getTime()
      return `${channel.replace('#', '')} has been live for ${this.l.u.timeSince(startTime)}`
    } else { // Offline
      const recent = await this.api.recentBroadcasts(channel)
      if (typeof recent !== 'object') return 'Cannot resolve recent streams'
      const video = recent.data.slice(0, 1)[0]
      console.log(video)
      const endTime = new Date(video.created_at).getTime() + this.l.u.parseTimeString(video.duration)
      return `${channel.replace('#', '')} has been offline for ${this.l.u.timeSince(endTime)}`
    }
  }
}
