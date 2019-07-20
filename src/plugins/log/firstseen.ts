import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { LogExtension } from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'firstseen',
  title: 'FirstSeen',
  description: 'Shows when a user sent their first message',
  default: {
    alias: '?firstseen',
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Show when you or user sent their first message: {alias} [<USER>]'],
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

    const display = await this.l.api.getDisplay(targetId)

    if (!this.log.getData(channelId)) return 'Log data unavailable'

    const user = this.log.getUser(channelId, targetId)
    if (!user) return `${targetId === userId ? 'You have' : `${display} has`} not been seen here before`

    const seenSec = user.events.chat ? user.events.chat.times[0] : 0

    if (!seenSec) return `${targetId === userId ? 'You have' : `${display} has`} no logged messages`

    const date = this.l.u.dateString(seenSec * 1000)
    if (targetId === userId) return `You were first seen on ${date}`
    else return `${display} was first seen on ${date}`
  }
}
