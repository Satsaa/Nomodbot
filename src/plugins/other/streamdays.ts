import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'streamdays',
  title: 'StreamDays',
  description: 'Tells the days the streamer usually streams on',
  default: {
    alias: ['?day', '?days', '?streamday', '?streamdays'],
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: [
    'Tell the days {channel} usually streams on: {alias} [<7-98>]',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    try {
      const recent = await this.l.api.recentBroadcasts(channelId)
      if (typeof recent !== 'object') return 'Cannot resolve recent broadcasts'

      const count = Math.ceil((+params[1] || 28) / 7) * 7 // Round to larger divisor of 7
      const videos = recent.data.slice(0, count)
      const dayCounts = [0, 0, 0, 0, 0, 0, 0]
      for (const video of videos) {
        dayCounts[new Date(video.created_at).getDay()]++
      }
      const percentages = dayCounts.map(v => v / count / 7)
      return `Monday: ${Math.round(percentages[6] * 100)}%, tuesday: ${Math.round(percentages[0] * 100)}, wednesday: ${Math.round(percentages[1] * 100)}, thursday: ${Math.round(percentages[2] * 100)}, friday: ${Math.round(percentages[3] * 100)}, saturday: ${Math.round(percentages[4] * 100)}, sunday: ${Math.round(percentages[5] * 100)}`

    } catch (err) {
      console.error(err)
      return 'Catastrophic error'
    }
  }
}
