import parse from './lib/args'

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
    'inspect-child': {
      aliases: ['i'],
      usage: ['--inspect-child', 'Add --inspect flag to child processes created by the manager.'],
      value: 'never',
      requireArgs: ['manager'],
    },
    'inspect-brk-child': {
      aliases: ['b'],
      usage: ['--inspect-brk-child', 'Add --inspect-brk flag to child processes created by the manager.'],
      value: 'never',
      requireArgs: ['manager'],
    },
    'no-auto-restart': {
      aliases: ['n'],
      usage: ['--no-auto-restart', 'Disable auto restarting when manager is enabled.'],
      value: 'never',
      requireArgs: ['manager'],
    },
    'global': {
      aliases: ['g'],
      usage: ['--global [<key>]', 'Set global[key] to bot instance. Defaults to global.bot'],
      value: 'optional',
    },
  },
} as const

export function getArgs(args = process.argv) {
  return parse(rules)
}
