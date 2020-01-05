import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'partmychannel',
  title: 'Leave My Channel',
  description: 'Leaves your channel',
  default: {
    alias: ['!leavemychannel', '?leavemychannel', '!leavechannel', '?leavechannel'],
    options: {
      userlvl: Userlvl.any,
      hidden: true,
      cooldown: 60, // If you are the channel owner you ignore this cooldown
    },
  },
  help: ['Instructs the bot to leave your channel: {alias}'],
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const []: [] = params

    if (!this.l.joinedChannels.includes(userId)) {
      return 'Your channel has already been left'
    }

    this.l.chat(channelId, 'Leaving your channel.')
    if (await this.l.part([userId])) {
      if (userId !== channelId) {
        return 'Successfully left your channel.'
      }
      return undefined
    } else {
      return 'Could not leave your channel due to an error or timeout.'
    }
  }
}
