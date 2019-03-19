import { Command } from '../src/Commander'
import { IrcMessage } from '../src/lib/parser'

export const options: Command = {
  type: 'command',
  id: 'smile',
  name: 'Smile',
  description: 'Smiling makes you happies',
  default: ['smile', {
    disabled: false,
    cooldown: 0,
    userCooldown: 0,
  }],
  help: 'Just smile! 4Head',
  actions: {
    call: (raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) => {
      return new Promise((resolve) => {
        console.log('We smilin')
        resolve(':) /\\ :)')
      })
    },
  },
}
