import { IrcMessage, PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'commands',
  title: 'Commands',
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

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    const aliases = {...this.l.getEnabledAliases(channelId), ...this.l.getEnabledGlobalAliases()}
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
