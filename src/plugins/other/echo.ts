import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'echo',
  title: 'Echo',
  description: 'Echoes the message sent by a user',
  default: {
    alias: '?echo',
    options: {
      userlvl: userlvls.sub, // Safety
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Reply with echo: {alias} [<echo...>]'],
  disableMention: true,
  unignoreMentions: true,
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.call = this.l.addCall(this, this.call, 'default', '[<echo...>]', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [echo]: [string[] | undefined] = params

    return echo ? echo.join(' ') : 'echo'
  }
}
