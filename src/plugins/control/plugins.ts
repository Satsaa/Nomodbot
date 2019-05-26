import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'plugins',
  title: 'Plugins',
  description: 'Displays enabled plugins',
  default: {
    alias: '$plugins',
    options: {
      cooldown: 30,
      userCooldown: 180,
    },
  },
  help: [
    'Display enabled plugins: {alias} [<type>]',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    let pluginOpts = this.l.getPlugins()
    const availableTypes = this.l.u.uniquify(pluginOpts.map(v => v.type), true)
    if (params[1]) {
      const type = params[1].toLowerCase()
      pluginOpts = pluginOpts.filter(v => v.type === type)
    }
    if (pluginOpts.length === 0) return `No plugins of that type. Available types: ${availableTypes.join(', ')}`
    const plugins = pluginOpts.map(v => v.id)
    return plugins.join(', ')
  }
}