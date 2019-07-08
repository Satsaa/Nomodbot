import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'streamdays',
  title: 'StreamDays',
  description: 'Tells the days the streamer usually streams on',
  default: {
    alias: ['?days', '?streamday', '?streamdays'],
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Tell the days {channel} usually streams on: {alias} [<1-8>]'],
  disableMention: true,
}

const DAY = 86400000

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.call = this.l.addCall(this, this.call, 'default', '[<1-8>]', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_weeks]: [number | undefined] = params
    const weeks = _weeks || 8

    try {
      const recent = await this.l.api.recentBroadcasts(channelId)
      if (typeof recent !== 'object') return 'Cannot resolve recent broadcasts'

      const videos = recent.data
      if (videos.length < 1) return 'There are no vods :('

      const toDay = new Date().getTime() / DAY
      const streamCounts = [0, 0, 0, 0, 0, 0, 0]

      let prevDateString = ''
      let total = 0
      for (let i = 1; i < weeks * 7 || i < videos.length; i++) {
        const date = new Date(videos[i].created_at)
        if (date.getTime() / DAY < toDay - weeks * 7) { // Stop on too old entries
          total = i
          break
        }

        const dateString = `${date.getUTCFullYear()}.${date.getUTCMonth()}.${date.getUTCDate()}`
        // Ignore multiple streams in one day
        if (prevDateString !== dateString) streamCounts[date.getUTCDay()]++
        prevDateString = dateString
      }

      const percentages = streamCounts.map((v, i) => `${Math.round(v / weeks * 100)}%`)
      return `Likelihood of stream (average of ${this.l.u.plural(Math.ceil(total / 7), 'week')}): Mon: ${percentages[1]}, tue: ${percentages[2]}, wed: ${percentages[3]}, thu: ${percentages[4]}, fri: ${percentages[5]}, sat: ${percentages[6]}, sun: ${percentages[0]}`
    } catch (err) {
      console.error(err)
      return `Error occurred: ${err.name}`
    }
  }
}
