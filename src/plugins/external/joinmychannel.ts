import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'joinmychannel',
  title: 'Join My Channel',
  description: 'Joins your channel',
  default: {
    alias: ['!joinmychannel', '?joinmychannel', '!joinchannel', '?joinchannel'],
    options: {
      userlvl: Userlvl.any,
      hidden: true,
      cooldown: 10,
    },
  },
  help: ['Instruct the bot to join your channel: {alias}'],
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [reason]: [string | undefined] = params

    if (this.l.joinedChannels.includes(userId)) {
      return 'Your channel has already been joined'
    }

    if (await this.l.part([userId])) {
      this.l.chat(userId, 'I have been summoned! Check github.com/Satsaa/Nomodbot/wiki/commands for a list of all default commands!')
      return 'Successfully joined your channel'
    } else {
      return 'Could not join your channel due to an error or timeout'
    }
  }
}
