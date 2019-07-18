import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { ACTION, CHAT, LogExtension } from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'randomquote',
  title: 'RandomQuote',
  description: 'Shows a random message someone has sent in {channel}',
  default: {
    alias: ['?randomquote', '?rq'],
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: ['Show a random message someone or user has sent: {alias} [<USER>]'],
  requirePlugins: ['log'],
  disableMention: true,
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary
  private log: LogExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension

    this.call = this.l.addCall(this, this.call, 'default', '[<USER>]', this.callTarget)
    this.call = this.l.addCall(this, this.call, 'default', '', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const []: [] = params

    const data = this.log.getData(channelId)
    if (!data) return this.l.insertAtUser('Log data unavailable', extra)

    const randomI = this.l.u.randomInt(0, data.messageCount - 1)
    let currentI = 0
    for (const uIdStr in data.users) {
      const randomId = ~~uIdStr
      const length = data.users[randomId].offsets.length

      if (currentI + length > randomI) {
        const res = await this.log.getMsg(channelId, randomId, randomI - currentI)
        if (!res) return this.l.insertAtUser('The logger unexpectedly didn\'t return a message', extra)
        if (res.type === CHAT || res.type === ACTION) {
          return `${await this.l.api.getDisplay(res.userId)} ${this.l.u.timeSince(res.ms, 1, true)} ago:${res.type === ACTION ? '/me' : ''} ${res.message}`
        }
        return this.l.insertAtUser(`Logger returned an invalid type: ${res.type}`, extra)
      } else {
        currentI += length
      }
    }
    if (currentI) {
      return this.l.insertAtUser('No message chosen?', extra)
    }
    return this.l.insertAtUser('There are no logged messages', extra)
  }

  public async callTarget(channelId: number, userId: number, params: any, extra: Extra) {
    const [targetId]: [number] = params

    const data = this.log.getData(channelId)
    if (!data) return this.l.insertAtUser('Log data unavailable', extra)

    const count = this.log.msgCount(channelId, targetId)
    if (!count) return this.l.insertAtUser(`${extra.words[1]} has no logs`, extra)

    const randomIndex = this.l.u.randomInt(0, count - 1)

    const res = await this.log.getMsg(channelId, targetId, randomIndex)
    if (!res) return this.l.insertAtUser('The logger unexpectedly didn\'t return a message', extra)
    if (res.type === CHAT || res.type === ACTION) {
      return `${await this.l.api.getDisplay(res.userId)} ${this.l.u.timeSince(res.ms, 1, true)} ago:${res.type === ACTION ? '/me' : ''} ${res.message}`
    }
    return this.l.insertAtUser(`Logger returned an invalid type: ${res.type}`, extra)
  }
}
