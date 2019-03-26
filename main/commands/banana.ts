import { PluginInstance, PluginOptions } from '../src/Commander'
import { IrcMessage } from '../src/lib/parser'

export const options: PluginOptions = {
  type: 'command',
  id: 'banana',
  name: 'Banana',
  description: 'Go bananas',
  default: {
    alias: 'banana',
    options: {
      disabled: false,
      cooldown: 0,
      userCooldown: 0,
    },
  },
  help: 'Goin bananas fo help',
  // requires: [['dynamic', 'asd', 'asd']],
}

export class Instance implements PluginInstance {

  constructor() {

  }

  public async call(channel: string, userstate: object, message: string, me: boolean) {
    console.log('🍌🍌🍌🍌🍌🍌🍌🍌')
    return ':O 🍌'
  }
}
