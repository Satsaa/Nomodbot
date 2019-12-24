import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'echo',
  title: 'Echo',
  description: 'Echoes the message sent by a user',
  default: {
    alias: '?echo',
    options: {
      userlvl: Userlvl.sub, // Safety
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Reply with echo: {alias} [<echo...>]'],
  disableMention: true,
  allowMentions: true,
  whisperOnCd: true,
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '[<echo...>]', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [echo]: [string[] | undefined] = params

    return echo ? echo.join(' ') : 'echo'
  }
}
