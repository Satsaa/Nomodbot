import { IrcMessage } from '../../main/client/parser'
import { PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

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
  help: [
    'Display enabled commands: {alias} [<userlevel> | <badge>]',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    const aliases = this.l.getActiveAliases(channelId)
    const aliasArray = []
    const userLvl = isNaN(+params[1]) ? undefined : +params[1]
    for (const alias in aliases) {
      if (userLvl !== undefined && (aliases[alias].permissions || 0) !== userLvl) continue
      if (aliases[alias].hidden) continue
      aliasArray.push(alias)
    }
    return aliasArray.sort().join(', ')
  }
}
