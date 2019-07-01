import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/PluginLib'

import { ACTION, CHAT, LogExtension } from './log'

export const options: PluginOptions = {
  type: 'command',
  id: 'myquote',
  title: 'MyQuote',
  description: 'Shows a random chat message a user has send in the past',
  default: {
    alias: '?myquote',
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
  private l: PluginLibrary
  private log: LogExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.log = this.l.ext.log as LogExtension
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    let uid: number = userId,
        index = 0
    if (params[1]) {
      if (isNaN(Number(params[1]))) {
        uid = await this.l.api.getId(params[1]) || userId

        const count = this.log.msgCount(channelId, uid) || 0
        if (typeof count === 'undefined') return this.l.insertAtUser('Log data unavailable', extra)
        index = isNaN(Number(params[2])) ? this.l.u.randomInt(0, count) : Number(params[2])
      } else {
        index = Number(params[1])
      }
    } else { index = this.l.u.randomInt(0, this.log.msgCount(channelId, userId) || 0) }

    const res = await this.log.getSmartIndexMsg(channelId, uid, index)
    if (!res) return this.l.insertAtUser('That user has no logged messages', extra)
    if (res.type === CHAT || res.type === ACTION) {
      return `${await this.l.api.getDisplay(res.userId)} ${this.l.u.timeSince(res.ms, 1, true)} ago:${res.type === ACTION ? '/me' : ''} ${res.message}`
    }
    return this.l.insertAtUser(`Logger returned an invalid type: ${res.type}`, extra)
  }
}
