import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/PluginLib'

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
    'Display disabled commands: {alias} disabled [<0-10>]',
    'Display hidden commands: {alias} hidden [<0-10>]',
    'Display enabled commands: {alias} [<0-10>]',
  ],
}

export class Instance implements PluginInstance {
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    const aliases = { ...this.l.getEnabledGlobalAliases(), ...this.l.getEnabledAliases(channelId) },
          aliasArray = [],
          disabled = params[1] && params[1].toLowerCase() === 'disabled',
          hidden = params[1] && params[1].toLowerCase() === 'hidden',
          userLvl = isNaN(Number(params[disabled || hidden ? 2 : 1])) ? undefined : Number(params[disabled || hidden ? 2 : 1])
    for (const alias in aliases) {
      if (userLvl !== undefined && (typeof aliases[alias].userlvl === 'undefined' ? userlvls.any : aliases[alias].userlvl) !== userLvl) continue
      if (hidden) {
        if (!aliases[alias].hidden) continue
      } else if (disabled) {
        if (!aliases[alias].disabled) continue
      } else {
        if (aliases[alias].hidden) continue
        if (aliases[alias].disabled) continue
      }
      aliasArray.push(alias)
    }
    if (disabled) return `Disabled commands: ${aliasArray.sort().join(', ')}`
    if (hidden) return `Hidden commands: ${aliasArray.sort().join(', ')}`
    return `Commands: ${aliasArray.sort().join(', ')}`
  }
}
