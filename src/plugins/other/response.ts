import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions } from '../../main/Commander'
import PluginLibrary from '../../main/pluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'response',
  title: 'Response',
  description: 'Create aliases that show a custom message',
  default: {
    alias: '?response',
    options: {
      permissions: 2,
    },
  },
  help: [
    'Respond with message: {alias} [<args...>]',
    'Create a response: {alias} add <message...>',
  ],
}

export class Instance implements PluginInstance {

  private l: PluginLibrary
  private variables: string[]

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.variables = ['channel', 'user', 'command', 'paramN']
  }

  public async call(channelId: number, userId: number, tags: PRIVMSG['tags'], params: string[], extra: Extra) {
    if (extra.alias.data) { // Message alias (has data entry)
      let result = ''
      for (const token of extra.alias.data as string[]) { // Variable
        if ((token.startsWith('$(') && token.endsWith(')'))
          || (token.startsWith('${') && token.endsWith('}'))) {
          const pureVar = token.slice(2, -1)
          switch (pureVar) {
            case 'channel':
              result += await this.l.api.getDisplay(channelId)
              break
            case 'user':
              result += await this.l.api.getDisplay(userId)
              break
            case 'command':
              result += params[0]
              break
            default:
              if (pureVar.startsWith('param')) {
                result += params[~~pureVar.slice(5)]
              } else result += token
              break
          }
        } else result += token
      }
      return result
    } else { // Control alias (no data key)
      if (!params[1]) return 'Define a command name (param 1)'
      if (!params[2]) return 'Define a message (params 2+)'

      const alias = params[1].toLowerCase()
      const message = params.slice(2).join(' ')
      const messageLc = message.toLowerCase()
      const variables: string[] = []

      let data: string[] = []

      const unknowns = []
      let toDataIndex = 0
      const varRegex = /(\$\([^\$()]+\)|\$\{[^\${)]+\})/g
      let match = varRegex.exec(messageLc)
      while (match !== null) {
        data.push(message.slice(toDataIndex, match.index))
        data.push(messageLc.slice(match.index, match.index + match[0].length))
        toDataIndex = match.index + match[0].length

        // Validate variable names
        variables.push(messageLc.slice(match.index, match.index + match[0].length))
        const variable = variables[variables.length - 1]
        if (variable) {
          const pureVar = variable.slice(2, -1)
          if (pureVar.startsWith('param')) {
            if (isNaN(+pureVar.slice(5)) || +pureVar.slice(5) < 1 || +pureVar.slice(5) !== Math.floor(+pureVar.slice(5))) {
              unknowns.push(pureVar)
            }
          } else if (!this.variables.includes(pureVar)) unknowns.push(pureVar)
        }
        match = varRegex.exec(messageLc)
      }
      if (unknowns.length) return `Unknown variable ${this.l.u.plural(unknowns.length, 'name', true)}: "${unknowns.join('", "')}". Available variable names: ${this.variables.join(', ')}`

      data.push(message.slice(toDataIndex, message.length))
      data = data.filter(v => v.length)

      console.log(data)

      this.l.createAlias(channelId, alias, {target: options.id, permissions: 0, data})
      return `Response created: ${alias}`
    }
  }
}
