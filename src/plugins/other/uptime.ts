import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/PluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'uptime',
  title: 'Uptime',
  description: 'Tells how long a channel has been live or offline',
  default: {
    alias: ['?uptime', '?downtime'],
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Tell how long {channel} has been live or offline: {alias}'],
}

export class Instance implements PluginInstance {
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    try {
      const stream = await this.l.api._streams({ user_id: channelId })
      if (typeof stream !== 'object') return 'Cannot resolve current stream'

      if (stream.data.length > 0) { // Live
        const startTime = new Date(stream.data[0].started_at).getTime()
        return `${await this.l.api.getDisplay(channelId)} has been live for ${this.l.u.timeSince(startTime)}`
      } else { // Offline
        const recent = await this.l.api.recentBroadcasts(channelId, { preferUpdate: true })
        if (typeof recent !== 'object') return 'Cannot resolve recent streams'

        if (recent.data.length === 0) return `${await this.l.api.getDisplay(channelId)} is not currently live`

        const video = recent.data.slice(0, 1)[0]
        console.log(video)

        const endTime = new Date(video.created_at).getTime() + this.l.u.parseTimeStr(video.duration)
        return `${await this.l.api.getDisplay(channelId)} has been offline for ${this.l.u.timeSince(endTime)}.`
          + ` The previous stream lasted for ${this.l.u.timeDuration(this.l.u.parseTimeStr(video.duration))}`
      }
    } catch (err) {
      console.error(err)
      return `Error occurred: ${err.name}`
    }
  }
}
