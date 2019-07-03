import { ArgsOptions } from './lib/args'

const rules: ArgsOptions = {
  strict: true,
  rules: {
    'join-message': {
      aliases: ['j'],
      usage: ['--join-message <channelId:message>', 'Sends <message> to <channel> when joining it for the first time'],
      requireValue: true,
    },
    'manager': {
      aliases: ['m'],
      usage: ['--manager', 'Run bot with manager. Manager handles autorestarting etc.'],
      noValue: true,
    },
  },
}

export default rules
