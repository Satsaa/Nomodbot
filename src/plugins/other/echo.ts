import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'echo',
  title: 'Echo',
  description: 'Echoes the message sent by a user',
  default: {
    alias: '?echo',
    options: {
      userlvl: userlvls.sub, // Safety
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: [
    'Reply with echo: {alias} <echo...>',
  ],
  atUser: false,
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    return params.splice(1).join(' ')
  }
}
