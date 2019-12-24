import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'
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
    alias: ['?suggest', '$suggest'],
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: [
    'Send a suggestion (bugs, features, etc.): {alias} <message...>',
    'Send a reply to the suggester: {alias} REPLY <messageId> <message...>',
    'Show entry at index: {alias} GET <messageId>',
    'Show newest suggestions that hasn\'t been read: {alias} NEW',
    'Show oldest suggestions that hasn\'t been read: {alias} OLD',
    'Count of unread suggestions: {alias} COUNT',
  ],
  requirePlugins: ['lists'],
  disableMention: true,
  whisperOnCd: true,
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private lists: ListsExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.lists = this.l.ext.lists as ListsExtension

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'REPLY <INDEX> <message...>', this.callReply)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'GET <INDEX>', this.callGet)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'NEW', this.callNew)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'OLD', this.callOld)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'COUNT', this.callCount)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '<message...>', this.callMain)
  }

  public async callReply(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, index, message]: ['REPLY', number, string[]] = params

    const suggestions = this.lists.getGlobalList<Suggestion>(options.id, [])
    if (!suggestions) return 'Suggestion data unavailable'

    if (!this.l.isPermitted({ userlvl: Userlvl.master }, userId, extra.irc.tags.badges)) return 'You are not permitted to edit suggestions'

    const [finalIndex, suggestion] = suggestions.getEntry(index)
    if (!suggestion) return 'No suggestions'
    suggestion.read = true
    suggestion.replierId = userId
    suggestion.reply = message.join(' ')

    const res = await this.l.whisper(suggestion.userId, fitStrings(this.l.maxMsgLength,
      [`Reply from ${await this.l.api.getDisplay(userId)} to suggestion #${finalIndex} (`, 2],
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

  public async callGet(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, index]: ['GET', number] = params

    const suggestions = this.lists.getGlobalList<Suggestion>(options.id, [])
    if (!suggestions) return 'Suggestion data unavailable'

    if (!this.l.isPermitted({ userlvl: Userlvl.master }, userId, extra.irc.tags.badges)) return 'You are not permitted to read suggestions'

    const [finalIndex, suggestion] = suggestions.getEntry(index)
    if (!suggestion) return 'No suggestions'
    suggestion.read = true
    return `Suggestion #${finalIndex}, [${await this.l.api.getDisplay(suggestion.channelId)}] ${await this.l.api.getDisplay(suggestion.userId)}: ${suggestion.message}`
  }

  public async callNew(channelId: number, userId: number, params: any, extra: Extra) {
    const [action]: ['NEW'] = params

    const suggestions = this.lists.getGlobalList<Suggestion>(options.id, [])
    if (!suggestions) return 'Suggestion data unavailable'

    if (!this.l.isPermitted({ userlvl: Userlvl.master }, userId, extra.irc.tags.badges)) return 'You are not permitted to read suggestions'
    for (let i = suggestions.entries.length - 1; i >= 0; i--) {
      const suggestion = suggestions.entries[i]
      if (!suggestion.read) {
        suggestion.read = true
        return `[${await this.l.api.getDisplay(suggestion.channelId)}] Suggestion #${i + 1} ${await this.l.api.getDisplay(suggestion.userId)}: ${suggestion.message}`
      }
    }
    return 'No unread suggestions'
  }

  public async callOld(channelId: number, userId: number, params: any, extra: Extra) {
    const [action]: ['OLD'] = params

    const suggestions = this.lists.getGlobalList<Suggestion>(options.id, [])
    if (!suggestions) return 'Suggestion data unavailable'

    if (!this.l.isPermitted({ userlvl: Userlvl.master }, userId, extra.irc.tags.badges)) return 'You are not permitted to read suggestions'

    let i = 0
    for (const suggestion of suggestions.entries) {
      if (!suggestion.read) {
        suggestion.read = true
        return `[${await this.l.api.getDisplay(suggestion.channelId)}] Suggestion #${i + 1} ${await this.l.api.getDisplay(suggestion.userId)}: ${suggestion.message}`
      }
      i++
    }
    return 'No unread suggestions'
  }

  public async callCount(channelId: number, userId: number, params: any, extra: Extra) {
    const [action]: ['COUNT'] = params

    const suggestions = this.lists.getGlobalList<Suggestion>(options.id, [])
    if (!suggestions) return 'Suggestion data unavailable'

    const total = suggestions.entries.length
    let totalRead = 0
    let totalReplied = 0
    for (const suggestion of suggestions.entries) {
      if (suggestion.read) totalRead++
      if (suggestion.reply) totalReplied++
    }
    return `Total suggestions: ${total}. Total read: ${totalRead}. Total replied: ${totalReplied}`
  }


  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [suggestion]: [string[]] = params

    const suggestions = this.lists.getGlobalList<Suggestion>(options.id, [])
    if (!suggestions) return 'Suggestion data unavailable'

    const [index] = suggestions.pushEntry({ channelId, userId, message: suggestion.join(' '), time: Date.now() })
    return `Suggestion #${index} sent. A Whisper will be sent when it is processed`
  }
}
