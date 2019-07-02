import util from 'util'
import { exec as _exec } from 'child_process'

import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/PluginLib'

const exec = util.promisify(_exec)

export const options: PluginOptions = {
  type: 'command',
  id: 'plugin',
  title: 'Plugin',
  description: 'Control states of plugins',
  default: {
    alias: '$plugin',
    options: {
      userlvl: userlvls.master,
    },
  },
  help: [
    'Load plugin: {alias} load <PLUGIN>',
    'Reload plugin: {alias} reload <PLUGIN>',
    'Unload plugin: {alias} unload <PLUGIN>',
    'Load new plugin from path: {alias} path <path>',
  ],
}

export class Instance implements PluginInstance {
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    if (!params[1]) return 'Define an action (param 1)'
    if (!params[2]) return `Define a ${params[1].toLowerCase() === 'path' ? 'path' : 'plugin'} (param 2)`

    let resMsg
    switch (params[1].toLowerCase()) {
      case 'load':
        if (!await this.compile()) return 'An error occurred during compilation'
        resMsg = (await this.l.loadPlugin(params[2])).message
        return resMsg || `Loaded ${params[2]} succesfully`

      case 'reload':
        if (!await this.compile()) return 'An error occurred during compilation'
        resMsg = (await this.l.reloadPlugin(params[2])).message
        return resMsg || `Reloaded ${params[2]} succesfully`

      case 'unload':
        resMsg = (await this.l.unloadPlugin(params[2])).message
        return resMsg || `Unloaded ${params[2]} succesfully`

      case 'path':
        try {
          if (!await this.compile()) return 'An error occurred during compilation'

          const options = await this.l.loadFromPath(params[2])
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
      default:
        return 'Unknown action'
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
