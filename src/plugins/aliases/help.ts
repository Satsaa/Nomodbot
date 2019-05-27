import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

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
  help: [
    'Display usage instructions of command: {alias} <command>',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    if (!params[1]) return 'Define a command (param 1)'
    const input = params[1].toLowerCase()
    const alias = this.l.getAlias(channelId, input) || this.l.getGlobalAlias(input)
    if (!alias) return 'No command with that name'

    const helps = this.l.getHelp(alias, true)
    if (!helps || !helps.length) return `${params[1]} has no usage instructions`

    return helps.join('. ')
  }

}
