import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'
import { LogExtension} from './log'

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
  help: [
    'Show when you or user sent their first message: {alias} [<user>]',
  ],
  requirePlugins: ['log'],
  atUser: true,
}

export class Instance implements PluginInstance {

  private l: PluginLibrary
  private log: LogExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    const targetId = params[1] ? await this.l.api.getId(params[1]) : userId
    if (!targetId) return 'Cannot find a user with that name'
    const display = params[1] ? await this.l.api.getDisplay(targetId) : tags['display-name']

    if (!this.log.getData) return 'Log data unavailable'

    const user = this.log.getUser(channelId, targetId)
    if (!user) return `${targetId === userId ? 'You have' : `${display} has`} not been seen here before`

    if (!user.times[0]) return `${targetId === userId ? 'You have' : `${display} has`} no logged messages`

    const date = this.l.u.dateString(user.times[0] * 1000)
    if (targetId === userId) return `You were first seen on ${date}`
    else return `${display} was first seen on ${date}`
  }
}
