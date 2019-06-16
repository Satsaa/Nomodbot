import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/PluginLib'

/*
A plugin file usually has 1 plugin, but you can have multiple if you export an array like:

const exp: Array<{options: PluginOptions, Instance: any}> = [
  {
    options: {
      ...
    },

    Instance: class implements PluginInstance {
      ...
    },
  },
  {
    options: {...},
    Instance: class implements PluginInstance {...},
  },
]
module.exports = exp
*/

export const options: PluginOptions = {
  type: 'command',
  id: 'example',
  title: 'Example',
  description: 'Is an example',
  default: {
    alias: '!example',
    options: {
      disabled: true,
      userlvl: userlvls.any,
      cooldown: 30,
      userCooldown: 60,
    },
  },
  creates: [
    ['folder', 'file'],
    ['channelFile'],
  ],
  // requireDatas: ['never','loaded'],
  // requirePlugins: ['notaplugin'],
  noUnload: true, // Blocks unloading
  help: [
    'Is an example: {alias} required this|that <variable> [optional] [<optVar>] [<multiword...>]',
    'nother example',
  ],
  disableMention: true,
  unignoreMentions: true,
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
