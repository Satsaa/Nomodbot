import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'evaluate',
  title: 'Evaluate',
  description: 'Evaluates a string and executes it',
  default: {
    alias: '$eval',
    options: {
      userlvl: Userlvl.master,
    },
  },
  help: ['Evaluate a string, execute it and return the result: {alias} <evalString...>'],
  disableMention: true,
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '<evalString...>', this.callMain)
  }

  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [evalString]: [string[]] = params

    try {
      // eslint-disable-next-line no-eval
      let result = eval(evalString.join(' '))

      if (typeof result === 'object' && typeof result.then === 'function') { // Thenable
        result = await result
      }

      if (typeof result === 'object' && typeof result.message === 'string') { // Messageful
        return result.message
      }

      return `${result}`
    } catch (err) {
      console.error(err)
      return `Error occurred: ${err.name}`
    }
  }
}
