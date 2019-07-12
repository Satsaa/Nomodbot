import parse from './lib/Args'

export const rules = {
  rules: {
    'join-message': {
      aliases: ['j'],
      usage: [
        '--join-message <channelId:message>...',
        'Send messages to channels when joining it for the first time.',
        'Underscores are replaced with spaces unless they are escaped with "\\".',
      ],
      type: (v: string) => v.match(/^\d+:/) ? v : undefined,
      typeError: 'Values for --join-message must be like <channelId:message>.',
      value: 'required',
      multi: true,
    },
    'manager': {
      aliases: ['m'],
      usage: ['--manager', 'Run bot with manager. Manager handles autorestarting etc.'],
      value: 'never',
    },
    'join-channel': {
      aliases: ['c'],
      usage: ['--join-channel <channelId>...', 'Join channels on bot launch.'],
      value: 'required',
      type: 'integer',
      multi: true,
    },
    'no-auto-restart': {
      aliases: ['n'],
      usage: ['--no-auto-restart', 'Disable auto restarting when manager is enabled.'],
      value: 'never',
      requireArgs: ['manager'],
    },
  },
} as const

export function getArgs(args = process.argv) {
  return parse(rules)
}
