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
    alias: ['?uptime', '?downtime'],
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
    try {
      const id = await this.api.getId(channel)
      if (!id) return 'Cannot resolve channel id'

      const stream = await this.api._streams({user_id: id})
      if (typeof stream !== 'object') return 'Cannot resolve current stream'

      if (stream.data.length > 0) { // Live
        const startTime = new Date(stream.data[0].started_at).getTime()
        return `${await this.api.getDisplay(id)} has been live for ${this.l.u.timeSince(startTime)}`
      } else { // Offline
        const recent = await this.api.recentBroadcasts(channel, {preferUpdate: true})
        if (typeof recent !== 'object') return 'Cannot resolve recent streams'

        if (recent.data.length === 0) return `${await this.api.getDisplay(id)} is offline`
        const video = recent.data.slice(0, 1)[0]
        console.log(video)
        const endTime = new Date(video.created_at).getTime() + this.l.u.parseTimeStr(video.duration)
        return `${await this.api.getDisplay(id)} has been offline for ${this.l.u.timeSince(endTime)}.`
          + ` The previous stream lasted for ${this.l.u.timeDuration(this.l.u.parseTimeStr(video.duration))}`
      }
    } catch (err) {
      console.error(err)
      return 'Catastrophic error!'
    }
  }
}
