import { IrcMessage } from '../../main/client/parser'
import { PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'
import { LogExtension} from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'users',
  title: 'Users',
  description: 'Shows how many users have chatted in the current channel',
  default: {
    alias: ['?users'] ,
    options: {
      cooldown: 10,
      usercooldown: 30,
    },
  },
  help: [
    'Show how many users have chatted in {channel}: {alias}',
  ],
  requirePlugins: ['log'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary
  private log: LogExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension
  }

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    const res = this.log.getData(channelId)
    if (!res) return 'Log data is unavailable at the moment'

    return `A total of ${this.l.u.plural(res.userCount, 'user has', 'users have')} written in chat`
  }
}
