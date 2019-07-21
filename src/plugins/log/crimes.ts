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
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary
  private log: LogExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension

    this.call = this.l.addCall(this, this.call, 'default', '[<USER>]', this.callMain)
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

  /** 0.50 -> 50% | 0.005555 -> 0.5% | 0.000050 -> 0.005% | 0.000... -> 0% */
  private getPctString(num: number) {
    num *= 100
    return `${num.toFixed(Math.floor(Math.log(num) / Math.log(10)))}%`
  }
}
