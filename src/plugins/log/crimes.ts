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
  help: ['Show how many crimes you or user has committed {channel}: {alias} [<user>]'],
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

    const total = this.log.eventCount(channelId, targetId, 'chat')
    if (total === undefined) return 'Log data unavailable'

    const crimes = this.log.eventCount(channelId, targetId, 'timeout')
    if (crimes === undefined) return 'Log data unavailable'

    const part1 = `${targetId === userId ? 'You have' : `${extra.words[1]} has`} committed ${this.l.u.plural(crimes, 'crime')}`
    return `${part1} (${this.getPctString(crimes / total)})${this.getCrimeEmoji(total / crimes)}`
  }

  private getCrimeEmoji(crimePercent: number) {
    if (crimePercent > 1 / 50) return ' 👺'
    if (crimePercent > 1 / 100) return ' 😈'
    if (crimePercent > 1 / 1000) return ''

    return ' 😇'
  }

  /** 0.50 -> 50% | 0.005555 -> 0.5% | 0.000050 -> 0.005% | 0.000... -> 0% */
  private getPctString(percentage: number) {
    if (percentage >= 0.01) return `${Math.round(percentage * 100)}%`

    const percentStr = String(percentage)

    const index = percentStr.search(/[1-9]/)

    return `${Number(`${`${percentStr.slice(0, index + 1)}` || '0'}`) * 100}%`
  }
}
