import { Plugin } from '../src/Commander'
import { IrcMessage } from '../src/lib/parser'

export const options: Plugin = {
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
  actions: {
    call: async (raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) => {
      console.log('We smilin')
      return ':) /\\ :)'
    },
  },
}
