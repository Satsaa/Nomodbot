import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/PluginLib'

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
    'Delete a quote at index: {alias} delete <INDEX>',
    'Show a random or specific quote: {alias} [<INDEX>]',
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
    let newValue: string
    let index
    let value
    const quotes = this.lists.getList<string>(options.id, channelId, [])
    if (!quotes) return 'Quote data unavailable'
    switch (params[1] ? params[1].toLowerCase() : undefined) {
      case 'add':
        if (!this.l.isPermitted({ userlvl: userlvls.mod }, userId, tags.badges)) return 'You are not permitted to edit quotes'
        if (!params[2]) return 'Define the new quote (params 3+)'
        newValue = params.slice(2).join(' ')
        ;[index] = quotes.pushEntry(newValue)
        if (index) return `Added new entry at index ${index}`
        else return 'Something went horribly wrong!'

      case 'edit':
        if (!this.l.isPermitted({ userlvl: userlvls.mod }, userId, tags.badges)) return 'You are not permitted to edit quotes'
        if (isNaN(Number(params[2]))) return 'Invalid index (param 2)'
        if (!params[3]) return 'Define the new quote (params 3+)'
        newValue = params.slice(3).join(' ')
        ;[index] = quotes.setEntry(~~params[2], newValue)
        if (index) return `Modified entry at index ${index}`
        else return 'Invalid index'

      case 'insert':
        if (!this.l.isPermitted({ userlvl: userlvls.mod }, userId, tags.badges)) return 'You are not permitted to edit quotes'
        if (isNaN(Number(params[2]))) return 'Invalid index (param 2)'
        if (!params[3]) return 'Define the new quote (params 3+)'
        newValue = params.slice(3).join(' ')
        ;[index] = quotes.insertEntry(~~params[2], newValue)
        if (index) return `Added new entry at index ${index}`
        else return 'Invalid index'

      case 'delete':
        if (!this.l.isPermitted({ userlvl: userlvls.mod }, userId, tags.badges)) return 'You are not permitted to edit quotes'
        if (isNaN(Number(params[2]))) return 'Invalid index (param 2)'
        ;[index, value] = quotes.delEntry(~~params[2])
        if (index) return `Deleted at ${index}: ${value}`
        else return 'Invalid index'

      case undefined:
        if (!quotes.entries.length) return 'There are no quotes'
        ;[index, value] = quotes.randomEntry()
        if (index) return `${index}: ${value}`
        else return 'Something went horribly wrong!'

      default:
        if (!quotes.entries.length) return 'There are no quotes'
        ;[index, value] = quotes.getEntry(~~params[1])
        if (index) return `${index}: ${value}`
        else return 'Something went horribly wrong!'
    }
  }
}
