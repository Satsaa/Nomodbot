import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'
import { Category, categories } from '../../main/logger'

const categoryNames = Object.keys(categories)

export const options: PluginOptions = {
  type: 'command',
  id: 'logger',
  title: 'Logger',
  description: 'Enable or disable logging categories temporarily',
  default: {
    alias: '$logger',
    options: {
      userlvl: userlvls.master,
    },
  },
  help: ['Enable or disable a logging category: {alias} enable|disable <category>'],
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', `enable|disable ${categoryNames.map(v => v.toLowerCase()).join('|')}`, this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, key]: ['enable'|'disable', string] = params

    for (const name of categoryNames) {
      if (key === name.toLowerCase()) {
        const cat: Category = categories[name as keyof typeof categories]
        cat.disabled = action === 'disable'
        return `${this.l.u.cap(action)}d ${name}`
      }
    }
    return 'No category with that name'
  }
}
