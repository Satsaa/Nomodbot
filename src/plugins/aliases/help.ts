import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
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
  help: ['Display usage instructions of command: {alias} <COMMAND>'],
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.call = this.l.addCall(this, this.call, 'default', '<COMMAND>', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [aliasName]: [string] = params
    if (!aliasName) return 'Define a command (param 1)'

    const input = aliasName.toLowerCase()
    const alias = this.l.getAlias(channelId, input)
    if (!alias) return 'Cannot find that command'

    const helps = this.l.getHelp(alias, true)
    if (!helps || !helps.length) return `${aliasName} has no usage instructions`

    return helps.join('. ')
  }
}
