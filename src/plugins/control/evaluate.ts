import { IrcMessage } from '../../main/client/parser'
import { PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'evaluate',
  title: 'Evaluate',
  description: 'Evaluates a string and executes it',
  default: {
    alias: '$eval',
    options: {
      permissions: 10,
    },
  },
  help: [
    'Evaluate a string, execute it and return the result: {alias} <evalString>',
    'Evaluate a string and execute it: {alias} noreturn <evalString>',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
  }

  public async call(channelId: number, userId: number, userstate: Required<IrcMessage['tags']>, message: string, params: string[], me: boolean) {
    try {
      if (params[1] && params[1].toLowerCase() === 'noreturn') {
        if (!params[2]) return 'Define the evaluation string (params 2+)'
        // tslint:disable-next-line: no-eval
        eval(params.slice(2).join(' '))
        return 'Success'
      }
      if (!params[1]) return 'Define the evaluation string (params 1+)'
      // tslint:disable-next-line: no-eval
      return eval(params.slice(1).join(' ')).toString()
    } catch (err) {
      console.error(err)
      return 'Catastrophic error!'
    }
  }
}
