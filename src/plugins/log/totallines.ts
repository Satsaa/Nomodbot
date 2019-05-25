import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'
import { LogExtension} from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'totallines',
  title: 'TotalLines',
  description: 'Shows the total amount of messages sent in the current channel',
  default: {
    alias: '?totallines',
    options: {
      cooldown: 30,
    },
  },
  help: [
    'Show the total messages sent in {channel}: {alias}',
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

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    const data = this.log.getData(channelId)
    if (!data) return 'Log data is unavailable at the moment'
    return `A total of ${this.l.u.plural(data.messageCount, 'message')} has been sent`
  }
}
