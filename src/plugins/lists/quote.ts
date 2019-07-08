import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { ListsExtension } from './lists'

export const options: PluginOptions = {
  type: 'command',
  id: 'quote',
  title: 'Quote',
  description: 'Create quotes for channels',
  default: {
    alias: '?quote',
    options: {
      cooldown: 10,
      userCooldown: 30,
    },
  },
  help: [
    'Add a new quote: {alias} add <quote...>',
    'Edit a quote at index: {alias} edit <INDEX> <quote...>',
    'Insert a new quote at index: {alias} insert <INDEX> <quote...>',
    'Delete a quote at index: {alias} del <INDEX>',
    'Show a random or specific quote: {alias} [<INDEX>]',
  ],
  requirePlugins: ['lists'],
  disableMention: true,
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary
  private lists: ListsExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.lists = this.l.ext.lists as ListsExtension

    this.call = this.l.addCall(this, this.call, 'default', 'add <quote...>', this.callAdd)
    this.call = this.l.addCall(this, this.call, 'default', 'edit <INDEX> <quote...>', this.callEdit)
    this.call = this.l.addCall(this, this.call, 'default', 'insert <INDEX> <quote...>', this.callInsert)
    this.call = this.l.addCall(this, this.call, 'default', 'del <INDEX>', this.callDelete)
    this.call = this.l.addCall(this, this.call, 'default', '[<INDEX>]', this.callMain)
  }

  public async callAdd(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, quote]: ['add', string[]] = params

    const quotes = this.lists.getList<string>(options.id, channelId, [])
    if (!quotes) return 'Quote data unavailable'
    if (!this.l.isPermitted({ userlvl: userlvls.master }, userId, extra.irc.tags.badges)) return 'You are not permitted to edit quotes'

    const [finalIndex] = quotes.pushEntry(quote.join(' '))
    if (finalIndex) return `Added new entry at index ${finalIndex}`
    else return 'Something went horribly wrong!'
  }

  public async callEdit(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, index, quote]: ['edit', number, string[]] = params

    const quotes = this.lists.getList<string>(options.id, channelId, [])
    if (!quotes) return 'Quote data unavailable'
    if (!this.l.isPermitted({ userlvl: userlvls.master }, userId, extra.irc.tags.badges)) return 'You are not permitted to edit quotes'

    const [finalIndex] = quotes.setEntry(index, quote.join(' '))
    if (index) return `Modified entry at index ${finalIndex}`
    else return 'Invalid index'
  }

  public async callInsert(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, index, quote]: ['insert', number, string[]] = params

    const quotes = this.lists.getList<string>(options.id, channelId, [])
    if (!quotes) return 'Quote data unavailable'
    if (!this.l.isPermitted({ userlvl: userlvls.master }, userId, extra.irc.tags.badges)) return 'You are not permitted to edit quotes'

    const [finalIndex] = quotes.insertEntry(index, quote.join(' '))
    if (finalIndex) return `Added new entry at index ${finalIndex}`
    else return 'Invalid index'
  }

  public async callDelete(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, index]: ['del', number] = params

    const quotes = this.lists.getList<string>(options.id, channelId, [])
    if (!quotes) return 'Quote data unavailable'
    if (!this.l.isPermitted({ userlvl: userlvls.master }, userId, extra.irc.tags.badges)) return 'You are not permitted to edit quotes'

    const [finalIndex, value] = quotes.delEntry(index)
    if (finalIndex) return `Deleted at ${finalIndex}: ${value}`
    else return 'Invalid index'
  }


  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [index]: [number | undefined] = params

    const quotes = this.lists.getList<string>(options.id, channelId, [])
    if (!quotes) return 'Quote data unavailable'
    if (!quotes.entries.length) return 'There are no quotes'

    const [finalIndex, value] = index ? quotes.getEntry(index) : quotes.randomEntry()
    if (finalIndex) return `${finalIndex}: ${value}`
    else return 'Something went horribly wrong!'
  }
}
