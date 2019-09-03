import util from 'util'
import { exec as _exec } from 'child_process'

import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

const exec = util.promisify(_exec)

export const options: PluginOptions = {
  type: 'command',
  id: 'update',
  title: 'Update',
  description: 'Pulls changes from origin and restarts the bot',
  default: {
    alias: '$update',
    options: {
      userlvl: userlvls.master,
    },
  },
  help: ['Update from repository and restart bot: {alias} [<branch>]'],
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '[<branch>]', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [_branch]: [string | undefined] = params
    const branch = _branch || 'master'

    if (!process.send) return 'Process manager is not available'

    if (!await this.exec(`git pull origin ${branch}`)) return 'An error occurred while updating repository'
    if (!await this.exec('tsc')) return 'An error occurred during compilation'

    process.send({ cmd: 'PUSH_ARGS', val: ['-j', `${channelId}:Restarted_and_updated`] })
    process.send({ cmd: 'AUTO_RESTART_NEXT', val: true })

    setTimeout(() => {
      process.exit()
    }, 666)

    return 'Restarting...'
  }

  private async exec(cmd: string) {
    try {
      console.log(await exec(cmd))
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }
}
