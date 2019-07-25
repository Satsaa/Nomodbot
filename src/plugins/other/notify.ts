import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'
import { PRIVMSG } from '../../main/client/parser'

export const options: PluginOptions = {
  type: 'command',
  id: 'notify',
  title: 'Notify',
  description: 'Shows a message to the target user when they type',
  default: {
    alias: '?notify',
    options: {
      userCooldown: 60,
    },
  },
  creates: [['notifies']],
  help: [
    'Notify a user with a message when they type in chat: {alias} <USER> <message...>',
    'Delete notifies you created: {alias} del [<USER>]',
  ],
  whisperOnCd: true,
}

interface NotifyData {
  [userId: number]: Array<{
    msg: string
    time: number
    fromId: number
  }>
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private listener: any

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.l.autoLoad('notifies', {})

    this.l.emitter.on('chat', this.listener = this.onChat.bind(this))

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'del [<USER>]', this.callDelete)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '<USER> <message...>', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [targetId, message]: [number, string[]] = params

    const data = this.l.getData(channelId, 'notifies') as NotifyData
    if (!data) return 'Unavailable: required data is not present'

    if (!data[targetId]) data[targetId] = []

    data[targetId].push({
      msg: message.join(' '),
      time: Date.now(),
      fromId: userId,
    })
    return `${extra.words[1]} now has ${this.l.u.plural(data[targetId].length, 'notify', 'notifies')}`
  }

  public async callDelete(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, targetId]: ['del', number | undefined] = params

    const data = this.l.getData(channelId, 'notifies') as NotifyData
    if (!data) return 'Unavailable: required data is not present'

    let deleteCount = 0
    if (targetId) {
      const preLength = data[targetId].length
      data[targetId] = data[targetId].filter(v => v.fromId !== userId)
      deleteCount += preLength - data[targetId].length
      if (!data[targetId].length) delete data[targetId]
    } else {
      for (const entry in data) {
        const preLength = data[entry].length
        data[entry] = data[entry].filter(v => v.fromId !== userId)
        deleteCount += preLength - data[entry].length
        if (!data[entry].length) delete data[entry]
      }
    }
    return `Deleted ${this.l.u.plural(deleteCount, 'notify', 'notifies')}`
  }

  public async unload() {
    this.l.emitter.removeListener('chat', this.listener)
  }

  private async onChat(channelId: number, userId: number, message: string, irc: PRIVMSG, me: boolean, self: boolean) {
    const data = this.l.getData(channelId, 'notifies') as NotifyData
    if (data === undefined) return
    if (data[userId]) {
      for (const notify of data[userId]) {
        const fromDisplay = await this.l.api.getDisplay(notify.fromId)
        const username = (irc ? irc.tags['display-name'] : await this.l.api.getDisplay(userId)) || 'unknown'
        this.l.chat(channelId, `${fromDisplay || 'error'} -> ${username} ${this.l.u.timeSince(notify.time, 1, false)} ago: ${notify.msg}`)
      }
      delete data[userId]
    }
  }
}
