import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { events, LogExtension } from './log'

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

    this.call = this.l.addCall(this, this.call, 'default', '<USER>', this.callTarget)
    this.call = this.l.addCall(this, this.call, 'default', '', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const []: [] = params

    const data = this.log.getData(channelId)
    if (!data) return this.l.insertAtUser('Log data unavailable', extra)

    const total = data.events.chat.eventCount
    if (!total) return this.l.insertAtUser('There are not logged messages?', extra)

    const randomI = this.l.u.randomInt(0, total)

    let msgI = 0
    for (const userKey in data.users) {
      const userData = data.users[userKey]
      const eventPosData = userData.events.chat
      if (!eventPosData) continue
      //            100               < 977 - 950 = 27
      // Selected
      if (eventPosData.offsets.length > randomI - msgI) {
        const res = await this.log.getEvent(channelId, ~~userKey, 'chat', randomI - msgI)
        if (!res) return this.l.insertAtUser('No quote received :(', extra)

        return `${await this.l.api.getDisplay(res.userId)} ${this.l.u.timeSince(res.ms, 1, true)} ago:${res.action ? ' /me' : ''} ${res.message}`
      } else {
        msgI += eventPosData.offsets.length
      }
    }
    return this.l.insertAtUser('No quote selected :(', extra)
  }

  public async callTarget(channelId: number, userId: number, params: any, extra: Extra) {
    const [targetId]: [number] = params

    const data = this.log.getData(channelId)
    if (!data) return this.l.insertAtUser('Log data unavailable', extra)

    const total = this.log.eventCount(channelId, targetId, 'chat') || 0
    if (!total) return this.l.insertAtUser(`${extra.words[1]} has no logged messages`, extra)

    const randomI = this.l.u.randomInt(0, total)

    const res = await this.log.getEvent(channelId, targetId, 'chat', randomI)
    if (!res) return this.l.insertAtUser(`${extra.words[1]} ceased to exist 👻`, extra)

    return `${await this.l.api.getDisplay(res.userId)} ${this.l.u.timeSince(res.ms, 1, true)} ago:${res.action ? ' /me' : ''} ${res.message}`
  }
}
