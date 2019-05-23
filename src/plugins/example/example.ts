import { IrcMessage } from '../../main/client/parser'
import { PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  name: 'example',
  title: 'Example',
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
  requireDatas: [],
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

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    return 'example message'
  }
}
