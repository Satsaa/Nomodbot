import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { LogExtension } from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'crimes',
  title: 'Crimes',
  description: 'Shows how many crimes/timeouts a user has committed in the current channel',
  default: {
    alias: ['?crimes'],
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Show how many crimes you or user has committed in {channel}: {alias} [<user>]'],
  requirePlugins: ['log'],
  whisperOnCd: true,
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private log: LogExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '[<USER>]', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_targetId]: [number | undefined] = params

    const targetId = _targetId || userId

    const total = this.log.eventCount(channelId, targetId, 'chat') || 0

    const crimes = this.log.eventCount(channelId, targetId, 'timeout') || 0

    const part1 = `${targetId === userId ? 'You have' : `${extra.words[1]} has`} committed ${this.l.u.plural(crimes, 'crime')}`
    return `${part1}${crimes ? ` (${this.getPctString(crimes / total)})` : ''}${this.getCrimeEmoji(crimes / total)}`
  }

  private getCrimeEmoji(crimePercent: number) {
    if (crimePercent > 1 / 50) return ' 👺'
    if (crimePercent > 1 / 100) return ' 😈'
    if (crimePercent > 1 / 1000) return ''

    return ' 😇'
  }

  /*
    num: 0.04361098996947231
    TOFIXED VALUE: -2
    FORMULA: -4 / 2.302585092994046
   */
  /** 0.50 -> 50% | 0.005555 -> 0.5% | 0.000050 -> 0.005% | 0.000... -> 0% */
  private getPctString(num: number) {
    num *= 100
    try {
      return `${num.toFixed(Math.floor(Math.log(num) / Math.log(10)))}%`
    } catch (err) {
      console.error('CRIMES TOFIXED FAIL:')
      console.error(`num: ${num}`)
      console.error(`TOFIXED VALUE: ${Math.floor(Math.log(num) / Math.log(10))}`)
      console.error(`FORMULA: ${Math.floor(Math.log(num))} / ${Math.log(10)}`)
      return `${num} (fallback return value)`
    }
  }
}
