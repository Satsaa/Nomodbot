import { CommandOptions } from '../src/Commander'
import { IrcMessage } from '../src/lib/parser'

export const options: CommandOptions = {
  type: 'command',
  id: 'smile',
  name: 'Smile',
  description: 'Smiling makes you happies',
  default: ['smile', {
    disabled: false,
    channelRateLimit: 0,
    globalCooldown: 0,
    userCooldown: 0,
    globalUserCooldown: 0,
  }],
  help: 'Just smile! 4Head',
  call: (raw: IrcMessage, channel: string, userstate: object, message: string, me: boolean) => {
    return new Promise((resolve) => {
      console.log('We smilin')
      resolve(':) /\\ :)')
    })
  },
}
