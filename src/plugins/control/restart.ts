import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'restart',
  title: 'Restart',
  description: 'Restarts the process if possible',
  default: {
    alias: '$restart',
    options: {
      userlvl: userlvls.master,
    },
  },
  help: [
    'Restart the process if possible: {alias}',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    if (!process.send) return 'Process manager is not available'

    process.send({cmd: 'AUTO_RESTART_NEXT', val: true})
    process.send({cmd: 'PUSH_ARGS', val: [`-jm=${channelId}:Restarted`]})

    process.exit()
    return 'Exit unsuccessful?'
  }
}
