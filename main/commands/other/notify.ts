import { PluginInstance, PluginOptions } from '../../src/Commander'
import { IrcMessage } from '../../src/lib/parser'
import PluginLibrary from '../../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'notify',
  name: 'Notify',
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
  [user: string]: Array<{
    msg: string,
    time: number,
    from: string,
  }>
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.l.autoLoad('notifies', {})

    this.l.emitter.on('chat', this.onChat.bind(this))
  }

  public async call(channel: string, user: string, userstate: IrcMessage['tags'], message: string, params: string[], me: boolean) {
    const data = this.l.getData(channel, 'notifies') as NotifyData
    if (data === undefined) return 'Unavailable: required data is not present'

    if (!params[1]) return 'Define a user (param 1)'
    if (params[1].toLowerCase() === 'delete') {
      let deleteCount = 0
      if (params[2]) {
        const entry = params[2].toLowerCase()
        const preLength = data[entry].length
        data[entry] = data[entry].filter(v => v.from.toLowerCase() !== user)
        deleteCount += preLength - data[entry].length
        if (!data[entry].length) delete data[entry]
      } else {
        for (const entry in data) {
          const preLength = data[entry].length
          data[entry] = data[entry].filter(v => v.from.toLowerCase() !== user)
          deleteCount += preLength - data[entry].length
          if (!data[entry].length) delete data[entry]
        }
      }
      return `Deleted ${this.l.u.plural(deleteCount, 'notify')}`
    } else {
      if (!params[2]) return 'Define a message (params 2+)'
      const target = params[1].toLowerCase()

      if (!data[target]) data[target] = []

      data[target].push({
        msg: params.slice(2).join(' '),
        time: Date.now(),
        from: userstate['display-name'] || 'Unknown',
      })
      return `${params[1]} now has ${this.l.u.plural(data[target].length, 'notify', 'notifies')}`
    }
  }

  private onChat(channel: string, user: string, userstate: IrcMessage['tags'], message: string, me: boolean, self: boolean) {
    const data = this.l.getData(channel, 'notifies') as NotifyData
    if (data === undefined) return
    if (data[user]) {
      for (const notify of data[user]) {
        this.l.chat(channel, `${notify.from} -> ${userstate['display-name']} ${this.l.u.timeSince(notify.time, 1, false)} ago: ${notify.msg}`)
      }
      delete data[user]
    }
  }
}
