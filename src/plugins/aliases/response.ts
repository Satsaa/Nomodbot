import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/PluginLib'

export const options: PluginOptions = {
  type: 'command',
  id: 'response',
  title: 'Response',
  description: 'Creates aliases that show a custom message',
  default: {
    alias: '?response',
    options: {
      userlvl: userlvls.mod,
    },
  },
  help: {
    default: [
      'Create a response: {alias} add <!COMMAND> <message...>',
      'Edit a response: {alias} edit <COMMAND> <message...>',
      'Get the raw response string: {alias} raw <COMMAND>',
      'Delete a response or a command: {alias} delete <COMMAND>',
    ],
    response: ['Respond with message: {alias} [<parameters...>]'],
  },
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
      for (const token of extra.alias.data as string[]) {
        if ((token.startsWith('$(') && token.endsWith(')'))
          || (token.startsWith('${') && token.endsWith('}'))) { // Variable
          const pureVar = token.slice(2, -1)
          switch (pureVar) {
            case 'channel': {
              const cid = await this.l.api.getDisplay(channelId)
              if (!cid) return 'Cannot find channel???'
              result += cid
              break
            }
            case 'user':
              result += tags['display-name']
              break
            case 'command':
              result += params[0]
              break
            default:
              if (pureVar.startsWith('param')) {
                const param = params[~~pureVar.slice(5)]
                if (!param) return `Parameter ${~~pureVar.slice(5)} needs to be defined`
                result += params[~~pureVar.slice(5)]
              } else {
                result += token
              }
              break
          }
        } else { result += token } // Normal
      }
      return result
    } else { // Control alias (no data key)
      let overwrite = false
      switch (params[1].toLowerCase()) {
        case 'add':
          break
        case 'edit':
          overwrite = true
          break
        case 'delete':
          if (this.l.delAlias(channelId, params[2])) return 'Command successfully deleted'
          else return 'Command deletion failed'

        case 'raw': {
          const alias = this.l.getAlias(channelId, params[2])
          if (!alias) return 'no command'
          if (alias.target !== options.id || !alias.data || !Array.isArray(alias.data)) return 'That command is not a response command'
          return `${params[2]}: "${alias.data.join('')}"`
        }
      }

      const alias = params[2].toLowerCase()
      const message = params.slice(3).join(' ')
      const messageLc = message.toLowerCase()
      const variables: string[] = []

      let data: string[] = []
      const unknowns = []
      let toDataIndex = 0
      const varRegex = /(\$\([^\$()]+\)|\$\{[^\${)]+\})/g
      let match = varRegex.exec(messageLc)
      while (match !== null) {
        // Fill alias data
        data.push(message.slice(toDataIndex, match.index))
        data.push(messageLc.slice(match.index, match.index + match[0].length))
        toDataIndex = match.index + match[0].length

        // Validate variable names
        variables.push(messageLc.slice(match.index, match.index + match[0].length))

        const variable = variables[variables.length - 1]
        if (variable) {
          const pureVar = variable.slice(2, -1)
          if (pureVar.startsWith('param')) {
            if (isNaN(Number(pureVar.slice(5))) || Number(pureVar.slice(5)) < 1 || Number(pureVar.slice(5)) !== Math.floor(Number(pureVar.slice(5)))) unknowns.push(pureVar)
          } else if (!this.variables.includes(pureVar)) { unknowns.push(pureVar) }
        }
        match = varRegex.exec(messageLc)
      }
      if (unknowns.length) return `Unknown variable ${this.l.u.plural(unknowns.length, 'name', true)}: "${unknowns.join('", "')}". Available variable names: ${this.variables.join(', ')}`

      data.push(message.slice(toDataIndex, message.length))
      data = data.filter(v => v.length)

      console.log(data)

      if (!overwrite && this.l.getAlias(channelId, alias)) return 'That command already exists'

      this.l.setAlias(channelId, alias, { target: options.id, cooldown: 10, userCooldown: 30, group: 'response', data })
      return `Response created: ${alias}`
    }
  }
}
