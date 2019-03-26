import { PluginInstance, PluginOptions } from '../src/Commander'
import { IrcMessage } from '../src/lib/parser'

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
      userCooldown: 0,
    },
  },
  help: 'Just smile! 4Head',
  // creates: [['dynamic', 'asd', 'asd']],
}

export class Instance implements PluginInstance {

  constructor() {

  }

  public async call(channel: string, userstate: object, message: string, me: boolean) {
    console.log('We smilin')
    return ':) /\\ :)'
  }
}
