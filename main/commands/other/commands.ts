import { PluginInstance, PluginOptions } from '../../src/Commander'
import { IrcMessage } from '../../src/lib/parser'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'commands',
  name: 'Commands',
  description: 'Displays enabled commands',
  default: {
    alias: '?commands',
    options: {
      cooldown: 30,
      userCooldown: 180,
    },
  },
  help: ['Display enabled commands: {alias} [<userlevel> | <badge>]'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channel: string, user: string, userstate: IrcMessage['tags'], message: string, params: string[], me: boolean) {
    const aliases = this.l.getActiveAliases(channel)
    const aliasArray = []
    for (const alias in aliases) {
      if (!aliases[alias].hidden) aliasArray.push(alias)
    }
    return aliasArray.sort().join(', ')
  }
}
