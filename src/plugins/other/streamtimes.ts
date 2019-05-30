import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'streamtimes',
  title: 'StreamTimes',
  description: 'Tells when the channel usually goes live and how long they stream',
  default: {
    alias: ['?stream', '?streams', '?streamtime', '?streamtimes'],
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: [
    'Tell when {channel} usually goes live and how long they stream (average of count): {alias} [<count>]',
  ],
  atUser: true,
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

      let count = 30
      if (params[1] && !isNaN(+params[1])) count = Math.round(+params[1])
      if (count < 1) count = 1 // Minimum of 1 stream

      const videos = recent.data.slice(0, count)

      let total = 0
      let totalDuration = 0
      const clockAngles: number[] = []
      for (const video of videos) {
        const date = new Date(video.created_at)
        clockAngles.push(date.getUTCHours() * 15 + date.getUTCMinutes() * (15 / 60))
        totalDuration += this.l.u.parseTimeStr(video.duration)
        total++
      }
      if (total < 1) return `${await this.l.api.getDisplay(channelId) || channelId} usually doesn't stream :/`

      const averageDuration = totalDuration / total
      let averageAngle = meanAngleDeg(clockAngles)
      if (averageAngle < 0) averageAngle = averageAngle + 360

      let hours: number | string = Math.floor(averageAngle / 15)
      let minutes: number | string = Math.round((averageAngle / 15 - hours) * 60)
      if (hours.toString().length === 1) hours = `0${hours}`
      if (minutes.toString().length === 1) minutes = `0${minutes}`

      if (total === 1) {
        return `${await this.l.api.getDisplay(channelId) || channelId}'s previous stream started at ${hours}:${minutes} UTC and `
          + `lasted for ${this.l.u.timeDuration(averageDuration, 2)}`
      }

      return `${await this.l.api.getDisplay(channelId) || channelId} usually streams at ${hours}:${minutes} UTC `
        + `for ${this.l.u.timeDuration(averageDuration, 2)} (previous ${this.l.u.plural(total, 'stream', 'streams')})`
    } catch (err) {
      console.error(err)
      return 'Catastrophic error'
    }
  }
}

function sum(a: any[]) {
  return a.reduce((prev, cur) => prev + cur)
}
function degToRad(a: number) {
  return Math.PI / 180 * a
}
function meanAngleDeg(a: number[]) {
  return 180 / Math.PI * Math.atan2(
    sum(a.map(degToRad).map(Math.sin)) / a.length,
    sum(a.map(degToRad).map(Math.cos)) / a.length,
  )
}
