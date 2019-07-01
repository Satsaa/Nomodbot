import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/PluginLib'
import { fitStrings } from '../../main/lib/util'

import { ListsExtension } from './lists'

interface Suggestion {
  channelId: number
  userId: number
  message: string
  time: number
  read?: true
  replierId?: number
  reply?: string
}

export const options: PluginOptions = {
  type: 'command',
  id: 'suggest',
  title: 'Suggest',
  description: 'Create bug reports, suggest features, etc.',
  default: {
    alias: '?suggest',
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: [
    'Send a reply to the suggester: {alias} REPLY <INDEX> <message...>',
    'Show entry at index: {alias} GET <INDEX>',
    'Show newest suggestions that hasn\'t been read: {alias} NEW',
    'Show oldest suggestions that hasn\'t been read: {alias} OLD',
    'Count of unread suggestions: {alias} COUNT',
    'Send a suggestion (bugs, features, etc.): {alias} <message...>',
  ],
  requirePlugins: ['lists'],
  disableMention: true,
}

export class Instance implements PluginInstance {
  private l: PluginLibrary
  private lists: ListsExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.lists = this.l.ext.lists as ListsExtension
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    const suggestions = this.lists.getGlobalList<Suggestion>(options.id, [])
    if (!suggestions) return 'Suggestion data unavailable'
    switch (params[1]) {
      case 'REPLY': {
        if (!this.l.isPermitted({ userlvl: userlvls.master }, userId, tags.badges)) return 'You are not permitted to edit suggestions'

        const [index, suggestion] = suggestions.getEntry(~~params[2])
        if (!suggestion) return 'No suggestions'
        suggestion.read = true
        suggestion.replierId = userId
        suggestion.reply = params.slice(3).join(' ')

        const res = await this.l.whisper(suggestion.userId, fitStrings(this.l.maxMsgLength,
          [`Reply from ${await this.l.api.getDisplay(userId)} to suggestion #${index} (`, 2],
          [suggestion.message, 0],
          [`) ${suggestion.reply}`, 1])
        )

        if (res) {
          return `Whispered ${await this.l.api.getDisplay(suggestion.userId)} with the message`
        } else {
          delete suggestion.replierId
          delete suggestion.reply
          return 'Failed to whisper the suggester'
        }
      }
      case 'GET': {
        if (!this.l.isPermitted({ userlvl: userlvls.master }, userId, tags.badges)) return 'You are not permitted to read suggestions'

        const [index, suggestion] = suggestions.getEntry(~~params[2])
        suggestion.read = true
        return `Suggestion #${index}, [${await this.l.api.getDisplay(suggestion.channelId)}] ${await this.l.api.getDisplay(suggestion.userId)}: ${suggestion.message}`
      }
      case 'RECENT':
        if (!this.l.isPermitted({ userlvl: userlvls.master }, userId, tags.badges)) return 'You are not permitted to read suggestions'
        for (let i = suggestions.entries.length - 1; i >= 0; i--) {
          const suggestion = suggestions.entries[i]
          if (!suggestion.read) {
            suggestion.read = true
            return `[${await this.l.api.getDisplay(suggestion.channelId)}] ${await this.l.api.getDisplay(suggestion.userId)}: ${suggestion.message}`
          }
        }
        return 'No unread suggestions'
      case 'OLD':
        if (!this.l.isPermitted({ userlvl: userlvls.master }, userId, tags.badges)) return 'You are not permitted to read suggestions'
        for (const suggestion of suggestions.entries) {
          if (!suggestion.read) {
            suggestion.read = true
            return `[${await this.l.api.getDisplay(suggestion.channelId)}] ${await this.l.api.getDisplay(suggestion.userId)}: ${suggestion.message}`
          }
        }
        return 'No unread suggestions'
      case 'COUNT': {
        const total = suggestions.entries.length
        let totalRead = 0
        let totalReplied = 0
        for (const suggestion of suggestions.entries) {
          if (suggestion.read) totalRead++
          if (suggestion.reply) totalReplied++
        }
        return `Total suggestions: ${total}. Total read: ${totalRead}. Total replied: ${totalReplied}`
      }
      default: {
        const [index, suggestion] = suggestions.pushEntry({ channelId, userId, message: params.slice(1).join(' '), time: Date.now() })
        return `Suggestion #${index} sent. A Whisper will be sent when it is processed`
      }
    }
  }
}
