import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'
import { timeDuration } from '../../main/lib/util'

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
  help: ['Tell when {channel} usually goes live and how long they stream (average of count): {alias} [<1-100>]'],
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.call = this.l.addCall(this, this.call, 'default', '[<1-100>]', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_days]: [number | undefined] = params
    const days = _days || 30

    try {
      const recent = await this.l.api.recentBroadcasts(channelId)
      if (typeof recent !== 'object') return 'Cannot resolve recent broadcasts'

      const videos = recent.data.slice(0, days)

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
      if (averageAngle < 0) averageAngle += 360

      let hours: number | string = Math.floor(averageAngle / 15)
      let minutes: number | string = Math.round((averageAngle / 15 - hours) * 60)

      // Make (in 1h), (3h 5m ago) string
      const date = new Date()
      const nowHours = date.getUTCHours()
      const nowMins = date.getUTCMinutes()
      const ms = (hours - nowHours) * 3600000 + (minutes - nowMins) * 60000
      const invert = ms < 0
      let remaningTime = ''
      if (invert) remaningTime = `(${timeDuration(-ms)} ago) `
      else remaningTime = `(in ${timeDuration(ms)}) `

      if (hours.toString().length === 1) hours = `0${hours}`
      if (minutes.toString().length === 1) minutes = `0${minutes}`

      if (total === 1) {
        return `${await this.l.api.getDisplay(channelId) || channelId}'s previous stream started at ${hours}:${minutes} UTC and `
          + `lasted for ${this.l.u.timeDuration(averageDuration, 2)}`
      }


      return `${await this.l.api.getDisplay(channelId) || channelId} streams at ${hours}:${minutes} UTC ${remaningTime}`
        + `for ${this.l.u.timeDuration(averageDuration, 2)} (average of previous ${this.l.u.plural(total, 'stream')})`
    } catch (err) {
      console.error(err)
      return `Error occurred: ${err.name}`
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
