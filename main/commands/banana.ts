import { CommandPlugin } from '../src/Commander'

export const options: CommandPlugin = {
  type: 'command',
  name: 'Banana',
  description: 'Go bananas',
  default: 'banana',
  defaultHasPrefix: true,
  help: 'Goin bananas fo help',
  call: () => {
    console.log('Banana call')
    return ':O 🍌'
  },
}
