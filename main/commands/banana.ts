import { PluginInstance, PluginOptions } from '../src/Commander'
import PluginLibrary from '../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'banana',
  name: 'Banana',
  description: 'Go bananas',
  default: {
    alias: 'banana',
    options: {
      disabled: false,
      cooldown: 10000,
      userCooldown: 0,
    },
  },
  help: 'Goin bananas fo help',
  // requires: [['dynamic', 'asd', 'asd']],
}

export class Instance implements PluginInstance {

  constructor(pluginLib: PluginLibrary) {

  }

  public async call(channel: string, userstate: object, message: string, me: boolean) {
    console.log('🍌🍌🍌🍌🍌🍌🍌🍌')
    return ':O 🍌'
  }

  public cooldown(channel: string, userstate: object, message: string, me: boolean) {
    console.log('🍌C🍌O🍌O🍌L🍌D🍌O🍌W🍌N🍌')
  }
}
