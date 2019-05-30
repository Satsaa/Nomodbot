import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'commands',
  title: 'Commands',
  description: 'Displays enabled commands',
  default: {
    alias: ['?commands', '$aliases'],
    options: {
      cooldown: 30,
      userCooldown: 60,
    },
  },
  help: [
    'Display enabled commands: {alias} [<userlevel> | <badge>]',
  ],
  atUser: false,
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    const aliases = { ...this.l.getEnabledGlobalAliases(), ...this.l.getEnabledAliases(channelId) }
    const aliasArray = []
    const userLvl = isNaN(+params[1]) ? undefined : +params[1]
    for (const alias in aliases) {
      if (userLvl !== undefined && (aliases[alias].userlvl || userlvls.any) !== userLvl) continue
      if (aliases[alias].hidden) continue
      aliasArray.push(alias)
    }
    return aliasArray.sort().join(', ')
  }
}
