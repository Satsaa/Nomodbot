import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/_commander'
import PluginLibrary from '../../main/PluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'help',
  title: 'Help',
  description: 'Displays usage instructions of commands',
  default: {
    alias: ['?help', '?usage'],
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Display usage instructions of command: {alias} <COMMAND>'],
}

export class Instance implements PluginInstance {
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    if (!params[1]) return 'Define a command (param 1)'

    const input = params[1].toLowerCase()
    const alias = this.l.getAlias(channelId, input)
    if (!alias) return 'Cannot find that command'

    const helps = this.l.getHelp(alias, true)
    if (!helps || !helps.length) return `${params[1]} has no usage instructions`

    return helps.join('. ')
  }
}
