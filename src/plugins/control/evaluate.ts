import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'evaluate',
  title: 'Evaluate',
  description: 'Evaluates a string and executes it',
  default: {
    alias: '$eval',
    options: {
      userlvl: userlvls.master,
    },
  },
  help: [
    'Evaluate a string, execute it and return the result: {alias} <evalString>',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    try {
      if (!params[1]) return 'Define the evaluation string (params 1+)'
      // tslint:disable-next-line: no-eval
      let result = eval(params.slice(1).join(' '))

      if (typeof result === 'object' && typeof result.then === 'function') { // Thenable
        result = await result
      }

      if (typeof result === 'object' && typeof result.message === 'string') { // Messageful
        return result.message
      }

      return result + ''
    } catch (err) {
      console.error(err)
      return 'Catastrophic error!'
    }
  }
}

export const test = 99999
