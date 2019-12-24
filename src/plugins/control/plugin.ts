import util from 'util'
import { exec as _exec } from 'child_process'

import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

const exec = util.promisify(_exec)

export const options: PluginOptions = {
  type: 'command',
  id: 'plugin',
  title: 'Plugin',
  description: 'Control states of plugins',
  default: {
    alias: '$plugin',
    options: {
      userlvl: Userlvl.master,
    },
  },
  help: [
    'Load plugin: {alias} load <!PLUGIN>',
    'Reload plugin: {alias} reload <PLUGIN>',
    'Unload plugin: {alias} unload <PLUGIN>',
    'Load new plugin from path: {alias} path <path>',
  ],
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'load <!PLUGIN>', this.callLoad)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'reload <PLUGIN>', this.callReload)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'unload <PLUGIN>', this.callUnload)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'path <path>', this.callPath)
  }

  public async callLoad(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, pluginId]: ['load', string] = params

    if (!await this.compile()) return 'An error occurred during compilation'

    const resMsg = (await this.l.loadPlugin(pluginId)).message
    return resMsg || `Loaded ${pluginId} succesfully`
  }
  public async callReload(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, pluginId]: ['reload', string] = params

    if (!await this.compile()) return 'An error occurred during compilation'

    const resMsg = (await this.l.reloadPlugin(pluginId)).message
    return resMsg || `Reloaded ${pluginId} succesfully`
  }
  public async callUnload(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, pluginId]: ['unload', string] = params

    const resMsg = (await this.l.unloadPlugin(pluginId)).message
    return resMsg || `Unloaded ${pluginId} succesfully`
  }
  public async callPath(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, path]: ['path', string] = params

    try {
      if (!await this.compile()) return 'An error occurred during compilation'

      const options = await this.l.loadFromPath(path)
      const names = options.map(v => v.id)
      const all = await Promise.all(options.map(v => this.l.waitPlugin(v.id), 5000))
      const results: string[] = []
      if (all.every(v => v)) return `Loaded ${names.join(', ')}`
      names.forEach((v, i) => {
        results.push(`${v} (${all[i] ? 'loaded' : 'timeout'})`)
      })
      return results.join(', ')
    } catch (err) {
      console.error(err)
      return `An error occurred: ${err.code}`
    }
  }

  private async compile() {
    try {
      await exec('tsc')
      return true
    } catch (err) {
      return false
    }
  }
}
