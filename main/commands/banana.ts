import { Command } from '../src/Commander'
import { IrcMessage } from '../src/lib/parser'

export const options: Command = {
  type: 'command',
  id: 'banana',
  name: 'Banana',
  description: 'Go bananas',
  default: ['banana', {
    disabled: false,
    cooldown: 0,
    userCooldown: 0,
  }],
  help: 'Goin bananas fo help',
  actions: {
    call: (raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) => {
      return new Promise((resolve) => {
        console.log('🍌🍌🍌🍌🍌🍌🍌🍌')
        resolve(':O 🍌')
      })
    },
  }
  ,
}
