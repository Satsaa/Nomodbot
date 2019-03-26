import { PluginInstance, PluginOptions } from '../src/Commander'
import PluginLibrary from '../src/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'smile',
  name: 'Smile',
  description: 'Smiling makes you happies',
  default: {
    alias: 'smile',
    options: {
      disabled: false,
      cooldown: 0,
      userCooldown: {duration: 10000, limit: 3, delay: 3000},
    },
  },
  help: 'Just smile! 4Head',
  // creates: [['dynamic', 'asd', 'asd']],
}

export class Instance implements PluginInstance {

  constructor(pluginLib: PluginLibrary) {

  }

  public async call(channel: string, userstate: object, message: string, me: boolean) {
    console.log('We smilin')
    return ':) /\\ :)'
  }

  public cooldown(channel: string, userstate: object, message: string, me: boolean) {
    console.log('Cooldown :(')
  }
}
