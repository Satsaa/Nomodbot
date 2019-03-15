import { CommandOptions } from '../src/Commander'
import { IrcMessage } from './../src/lib/parser'

export const options: CommandOptions = {
  type: 'command',
  id: 'banana',
  name: 'Banana',
  description: 'Go bananas',
  default: ['banana', {
    disabled: false,
    channelRateLimit: 0,
    globalCooldown: 0,
    userCooldown: 0,
    globalUserCooldown: 0,
  }],
  help: 'Goin bananas fo help',
  call: (raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) => {
    return new Promise((resolve) => {
      console.log('🍌🍌🍌🍌🍌🍌🍌🍌')
      resolve(':O 🍌')
    })
  },
}
