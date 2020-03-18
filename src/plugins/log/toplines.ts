import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { LogExtension } from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'toplines',
  title: 'Top Lines',
  description: 'Shows the top 10 chatters',
  default: {
    alias: ['?toplines', '?topchatters'],
    options: {
      cooldown: 60,
    },
  },
  help: ['Show the top 10 chatters: {alias}'],
  requirePlugins: ['log'],
  whisperOnCd: true,
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private log: LogExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const []: [] = params

    try {
      const topPoints = new Array(10).fill(-Infinity) as number[]
      const topIds = new Array(10).fill(0) as number[]

      const logs = this.log.getData(channelId)
      if (!logs) return 'Data unavailable'

      for (const id in logs.users) {
        const userLogs = logs.users[~~id]

        if (!userLogs.events.chat) continue

        const count = userLogs.events.chat.offsets.length

        if (userLogs.events.chat) {
          for (let i = 0; i < 10; i++) {
            if (topPoints[i] < count) {
              topPoints.splice(i, 0, count)
              topIds.splice(i, 0, ~~id)
              topPoints.pop()
              topIds.pop()
              break
            }
          }
        }
      }

      let res = ''
      for (let i = 0; i < 10; i++) {
        res += `${await this.l.api.getDisplay(topIds[i])}, ${topPoints[i]} lines; `
      }
      return res
    } catch (err) {
      console.error(err)
      return `Error occurred: ${err.name}`
    }
  }
}
