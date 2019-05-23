import { IrcMessage } from '../../main/client/parser'
import { PluginInstance, PluginOptions } from '../../main/Commander'
import * as u from '../../main/lib/util'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'bottime',
  title: 'Bottime',
  description: 'Display how long the bot has been running',
  default: {
    alias: '?bottime',
    options: {
      cooldown: 10,
      usercooldown: 30,
    },
  },
  help: ['Display bot uptime: {alias}'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    return `The bot has been running for ${u.plural(Math.floor(process.uptime()), 'second')}`
  }
}
