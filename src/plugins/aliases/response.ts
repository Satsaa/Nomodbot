import { PRIVMSG } from '../../main/client/parser'
import { Extra, PluginInstance, PluginOptions, userlvls } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

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
      'Delete a response or a command: {alias} del <COMMAND>',
    ],
    response: ['Respond with message: {alias} [<parameters...>]'],
  },
}

export class Instance implements PluginInstance {
  public call: PluginInstance['call']
  private l: PluginLibrary
  private variables: string[]

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.variables = ['channel', 'user', 'command', 'paramN']

    this.call = this.l.addCall(this, this.call, 'default', 'add <!COMMAND> <message...>', this.callAddEdit) // Same handler
    this.call = this.l.addCall(this, this.call, 'default', 'edit <COMMAND> <message...>', this.callAddEdit) // Same handler
    this.call = this.l.addCall(this, this.call, 'default', 'raw <COMMAND>', this.callRaw)
    this.call = this.l.addCall(this, this.call, 'default', 'del <COMMAND>', this.callDelete)

    this.call = this.l.addCall(this, this.call, 'response', '[<parameters...>]', this.callResponse)
  }


  public async callAddEdit(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, aliasName, _message]: ['add' | 'edit', string, string[]] = params

    const overwrite = action === 'edit'
    const message = _message.join(' ')
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

    if (!overwrite && this.l.getAlias(channelId, aliasName)) return 'That command already exists'

    this.l.setAlias(channelId, aliasName, { target: options.id, cooldown: 10, userCooldown: 30, group: 'response', data })
    return `Response created: ${aliasName}`
  }

  public async callRaw(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, aliasName]: ['raw', string] = params

    const alias = this.l.getAlias(channelId, aliasName)
    if (!alias) return 'no command'
    if (alias.target !== options.id || !alias.data || !Array.isArray(alias.data)) return 'That command is not a custom response command'
    return `${aliasName}: "${alias.data.join('')}"`
  }

  public async callDelete(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, aliasName]: ['del', string] = params

    const alias = this.l.getAlias(channelId, aliasName)
    if (!alias) return 'no command'
    if (alias.target !== options.id || !alias.data || !Array.isArray(alias.data)) {
      const commandAliases = this.l.getAliasesById(channelId, 'command') || {}
      const commandAliasName = Object.keys(commandAliases)[0]
      if (commandAliasName) return `That command is not a custom response command. Use "${commandAliasName} del ${aliasName}" instead`
      return 'That command is not a custom response command. A command of the plugin "command" can delete this, but none exist!'
    }

    if (this.l.delAlias(channelId, aliasName)) return 'Command successfully deleted'
    else return 'Command deletion failed'
  }

  public async callResponse(channelId: number, userId: number, params: any, extra: Extra) {
    const [_parameters]: [any[] | undefined] = params
    const parameters = _parameters || []

    if (!extra.alias.data) return 'Corrupted response alias. Data entry is falsy'

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
            result += extra.irc.tags['display-name']
            break
          case 'command':
            result += extra.words[0]
            break
          default:
            if (pureVar.startsWith('param')) {
              const index = ~~pureVar.slice(5) - 1
              const param = parameters[index]
              if (!param) return `Parameter ${index + 1} needs to be defined`
              result += parameters[index]
            } else {
              result += token
            }
            break
        }
      } else { result += token } // Normal
    }
    return result
  }
}
