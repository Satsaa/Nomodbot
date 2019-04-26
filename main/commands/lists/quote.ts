import { IrcMessage } from '../../src/client/parser'
import { PluginInstance, PluginOptions } from '../../src/Commander'
import PluginLibrary from '../../src/pluginLib'
import { ListsExtension } from './lists'

export const options: PluginOptions = {
  type: 'command',
  id: 'quote',
  name: 'Quote',
  description: 'Create quotes for channels',
  default: {
    alias: '?quote',
    options: {
      cooldown: 10,
      usercooldown: 30,
    },
  },
  help: [
    'Show a random or specific quote: {alias} [<index>]',
    'Add a new quote: {alias} add <quote>',
    'Edit a quote at index: {alias} edit <index> <quote>',
    'Insert a new quote at index: {alias} insert <index> <quote>',
    'Delete a quote at index: {alias} delete <index>',
  ],
  requiresPlugins: ['lists'],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary
  private lists: ListsExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.lists = this.l.ext.lists as ListsExtension
  }

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    let newValue: string
    let index
    let value
    const quotes: ReturnType<ListsExtension['getList']> = this.lists.getList(options.id, channelId, [])
    const user = userstate['display-name']
    switch (params[1] ? params[1].toLowerCase() : undefined) {

      case 'edit':
      case 'modify':
      case 'mod':
      case 'set':
      case 'change':
        if (!this.l.isPermitted(2, userstate.badges, userId)) return `@${user} Unpermitted action`
        if (isNaN(+params[2])) return 'Invalid index (param 2)'
        if (!params[3]) return 'Define the new quote (param 3+)'
        newValue = params.slice(3).join(' ');
        [index] = quotes.setEntry(~~params[2], newValue)
        if (index) return `Modified entry at index ${index}`
        else return 'Invalid index'

      case 'add':
      case 'new':
      case 'push':
      case 'create':
        if (!this.l.isPermitted(2, userstate.badges, userId)) return `@${user} Unpermitted action`
        if (!params[2]) return 'Define the new quote (param 2+)'
        newValue = params.slice(2).join(' ');
        [index] = quotes.pushEntry(newValue)
        if (index) return `Added new entry at index ${index}`
        else return 'Something went horribly wrong!'

      case 'insert':
      case 'splice':
        if (!this.l.isPermitted(2, userstate.badges, userId)) return `@${user} Unpermitted action`
        if (isNaN(+params[2])) return 'Invalid index (param 2)'
        if (!params[3]) return 'Define the new quote (param 3+)'
        newValue = params.slice(3).join(' ');
        [index] = quotes.insertEntry(~~params[2], newValue)
        if (index) return `Added new entry at index ${index}`
        else return 'Invalid index'

      case 'del':
      case 'delete':
      case 'remove':
        if (!this.l.isPermitted(2, userstate.badges, userId)) return `@${user} Unpermitted action`
        if (isNaN(+params[2])) return 'Invalid index (param 2)';
        [index, value]  = quotes.delEntry(~~params[2])
        if (index) return `Deleted at ${index}: ${value}`
        else return 'Invalid index'

      case undefined:
        if (!quotes.entries.length) return 'There are no quotes';
        [index, value] = quotes.randomEntry()
        if (index) return `${index}: ${value}`
        else return 'Something went horribly wrong!'

      default:
        if (!quotes.entries.length) return 'There are no quotes';
        [index, value] = quotes.getEntry(~~params[1])
        if (index) return `${index}: ${value}`
        else return 'Something went horribly wrong!'
    }
  }
}
