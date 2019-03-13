import { CommandPlugin } from '../src/Commander'

export const options: CommandPlugin = {
  type: 'command',
  name: 'Smile',
  description: 'Smile more',
  default: 'smile',
  defaultHasPrefix: false,
  help: 'Be happy',
  call: () => {
    console.log('Banana call')
    return ':)'
  },
}
