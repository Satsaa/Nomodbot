import { IrcMessage, PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'example',
  title: 'Example',
  description: 'Is an example',
  default: {
    alias: '!example',
    options: {
      disabled: true,
      permissions: 0,
      cooldown: 30,
    },
  },
  creates: [
    ['folder', 'file'],
    ['channelFile'],
  ],
  // requireDatas: ['never','loaded'],
  // requirePlugins: ['notaplugin'],
  unloadable: true,
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

  public async init() {
    // Command was on cooldown
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    return 'example message'
  }

  public cooldown(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    // Command was on cooldown
  }

  public async unload() {
    // Remove referecens (on events etc)
    // No need to unload creates here
  }
}
