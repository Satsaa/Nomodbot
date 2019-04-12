import { IrcMessage } from '../../src/client/parser'
import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'echo',
  name: 'Echo',
  description: 'Echoes the message sent by a user',
  default: {
    alias: '?echo',
    options: {
      cooldown: 10,
      usercooldown: 30,
    },
  },
  help: ['Reply with echo: {alias} <echo...>'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    return params.splice(1).join(' ')
  }
}
