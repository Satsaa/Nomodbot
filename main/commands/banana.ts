import { Plugin } from '../src/Commander'
import { IrcMessage } from '../src/lib/parser'

export const options: Plugin = {
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
  actions: {
    call: async (raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) => {
      console.log('🍌🍌🍌🍌🍌🍌🍌🍌')
      return ':O 🍌'
    },
  },
}

export default class NewPluginStructure {

  constructor() {

  }

  public call() {

  }
}
