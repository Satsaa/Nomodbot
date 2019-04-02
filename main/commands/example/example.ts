import { PluginInstance, PluginOptions } from '../../src/Commander'
import { IrcMessage } from '../../src/lib/parser'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'example',
  name: 'Example',
  description: 'Is an example',
  default: {
    alias: '!example',
    options: {
      disabled: true,
      permissions: 10,
      cooldown: 30,
      userCooldown: 60,
    },
  },
  requires: [],
  creates: [['fake', 'file']],
  help: [
    'Is an example: {alias} required <variable> [optional] [<optVar>] this | that <multiword...>',
    'nother example',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channel: string, user: string, userstate: IrcMessage['tags'], message: string, params: string[], me: boolean) {
    return 'example message'
  }
}
