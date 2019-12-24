import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'plugins',
  title: 'Plugins',
  description: 'Displays enabled plugins',
  default: {
    alias: ['$plugins', '?plugins'],
    options: {
      cooldown: 30,
      userCooldown: 60,
    },
  },
  help: ['Display enabled plugins: {alias} [<type>]'],
  whisperOnCd: true,
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '[<type>]', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    let [type]: [string | undefined] = params

    let pluginOpts = this.l.getPlugins()
    const availableTypes = this.l.u.deduplicate(pluginOpts.map(v => v.type), true)
    if (type) {
      type = type.toLowerCase()
      pluginOpts = pluginOpts.filter(v => v.type === type)
    }
    if (pluginOpts.length === 0) return `No plugins of that type. Available types: ${availableTypes.join(', ')}`

    const plugins = pluginOpts.map(v => v.id).sort()
    return plugins.join(', ')
  }
}
