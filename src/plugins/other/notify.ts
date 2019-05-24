import { IrcMessage, PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'notify',
  title: 'Notify',
  description: 'Shows a message to the target user when they type',
  default: {
    alias: '?notify',
    options: {
      userCooldown: 90,
    },
  },
  creates: [['notifies']],
  help: [
    'Notify a user with a message when they type in chat: {alias} <user> <message...>',
    'Delete notifies you created: {alias} delete [<user>]',
  ],
}

interface NotifyData {
  [userId: number]: Array<{
    msg: string,
    time: number,
    fromId: number,
  }>
}

export class Instance implements PluginInstance {

  private l: PluginLibrary
  private listener: any

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.l.autoLoad('notifies', {})

    this.l.emitter.on('chat', this.listener = this.onChat.bind(this))
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    const data = this.l.getData(channelId, 'notifies') as NotifyData
    if (!data) return 'Unavailable: required data is not present'

    if (!params[1]) return 'Define a user (param 1)'
    if (params[1].toLowerCase() === 'delete') {
      let deleteCount = 0
      if (params[2]) {
        const entry = await this.l.api.getId(params[2].toLowerCase())
        if (!entry) return "Can't find that user"
        const preLength = data[entry].length
        data[entry] = data[entry].filter(v => v.fromId !== userId)
        deleteCount += preLength - data[entry].length
        if (!data[entry].length) delete data[entry]
      } else {
        for (const entry in data) {
          const preLength = data[entry].length
          data[entry] = data[entry].filter(v => v.fromId !== userId)
          deleteCount += preLength - data[entry].length
          if (!data[entry].length) delete data[entry]
        }
      }
      return `Deleted ${this.l.u.plural(deleteCount, 'notify', 'notifies')}`
    } else {
      if (!params[2]) return 'Define a message (params 2+)'
      const target = await this.l.api.getId(params[1].toLowerCase())
      if (!target) return "Can't find that user"

      if (!data[target]) data[target] = []

      data[target].push({
        msg: params.slice(2).join(' '),
        time: Date.now(),
        fromId: userId,
      })
      return `${params[1]} now has ${this.l.u.plural(data[target].length, 'notify', 'notifies')}`
    }
  }

  public async unload() {
    this.l.emitter.removeListener('chat', this.listener)
  }

  private async onChat(channelId: number, userId: number, tags: PRIVMSG['tags'], message: string, me: boolean) {
    const data = this.l.getData(channelId, 'notifies') as NotifyData
    if (data === undefined) return
    if (data[userId]) {
      for (const notify of data[userId]) {
        const fromDisplay = await this.l.api.getDisplay(notify.fromId)
        this.l.chat(channelId, `${fromDisplay || 'error'} -> ${tags['display-name']} ${this.l.u.timeSince(notify.time, 1, false)} ago: ${notify.msg}`)
      }
      delete data[userId]
    }
  }
}
