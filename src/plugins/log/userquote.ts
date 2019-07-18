import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { ACTION, CHAT, LogExtension } from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'userquote',
  title: 'UserQuote',
  description: 'Shows a random chat message a user has send in the past',
  default: {
    alias: '?userquote',
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: [
    'Show a random or specific message you have sent: {alias} [<INDEX>]',
    'Show a random or specific message user has sent: {alias} <USER> [<INDEX>]',
  ],
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

    this.call = this.l.addCall(this, this.call, 'default', '<INDEX>', this.callIndex)
    this.call = this.l.addCall(this, this.call, 'default', '<USER> [<INDEX>]', this.callUser)
    this.call = this.l.addCall(this, this.call, 'default', '', this.callRandom)
  }

  public async callRandom(channelId: number, userId: number, params: any, extra: Extra) {
    const []: [] = params
    const targetId = userId
    let index

    if (!index) index = this.l.u.randomInt(0, this.log.msgCount(channelId, userId) || 0)

    const res = await this.log.getSmartIndexMsg(channelId, targetId, index)
    if (!res) return this.l.insertAtUser('That user has no logged messages', extra)
    if (res.type === CHAT || res.type === ACTION) {
      return `${await this.l.api.getDisplay(res.userId)} ${this.l.u.timeSince(res.ms, 1, true)} ago:${res.type === ACTION ? '/me' : ''} ${res.message}`
    }
    return this.l.insertAtUser(`Logger returned an invalid type: ${res.type}`, extra)
  }

  public async callIndex(channelId: number, userId: number, params: any, extra: Extra) {
    const [index]: [number] = params
    const targetId = userId

    const res = await this.log.getSmartIndexMsg(channelId, targetId, index)
    if (!res) return this.l.insertAtUser('That user has no logged messages', extra)
    if (res.type === CHAT || res.type === ACTION) {
      return `${await this.l.api.getDisplay(res.userId)} ${this.l.u.timeSince(res.ms, 1, true)} ago:${res.type === ACTION ? '/me' : ''} ${res.message}`
    }
    return this.l.insertAtUser(`Logger returned an invalid type: ${res.type}`, extra)
  }

  public async callUser(channelId: number, userId: number, params: any, extra: Extra) {
    const [targetId, _index]: [number, number | undefined] = params

    const index = _index === undefined ? this.l.u.randomInt(0, this.log.msgCount(channelId, userId) || 0) : _index

    const res = await this.log.getSmartIndexMsg(channelId, targetId, index)
    if (!res) return this.l.insertAtUser('That user has no logged messages', extra)
    if (res.type === CHAT || res.type === ACTION) {
      return `${await this.l.api.getDisplay(res.userId)} ${this.l.u.timeSince(res.ms, 1, true)} ago:${res.type === ACTION ? '/me' : ''} ${res.message}`
    }
    return this.l.insertAtUser(`Logger returned an invalid type: ${res.type}`, extra)
  }
}
