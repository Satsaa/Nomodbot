
import TwitchClient from './client/Client'
import Commander, { Command } from './Commander'
import { addArticle, commaPunctuate, plural, uniquify } from './lib/util'

interface CommandParameter {
  // Whether or not the field is optional
  opt: boolean,
  // Whether or not the field is variable
  var: boolean,
  // Whether or not the field is multi word
  multi: boolean,
  // Whether or not the field is case sensitive
  case: boolean,
  // Field without tokens and is an array if field is a tuple
  pure: string | string[],
  // Raw field with tokens
  raw: string
  // Possible compiled regex
  regex?: RegExp | RegExp[]
}

type CommandParameters = CommandParameter[]

/**
 * Validates parameter and handles parameter checking for command plugins
 */
export default class ParamValidator {
  private commander: Commander
  private client: TwitchClient
  private cmdParams: {[pluginId: string]: {[group: string]: CommandParameters[]}}
  private checkables: string[]

  constructor(commander: Commander, client: TwitchClient) {
    this.commander = commander
    this.client = client
    this.cmdParams = {}

    this.checkables = ['USER', 'USERS', 'CHANNEL', 'CHANNELS', 'COMMAND', 'COMMANDS', '!COMMAND', '!COMMANDS', 'PLUGIN', 'PLUGINS', '!PLUGIN', '!PLUGINS']
  }

  /** Generates user readable output when usage is not valid */
  public async validate(channelId: number, pluginId: string, group: string | undefined, words: string[])
    : Promise<{pass: false, message: string} | {pass: true, replace: string[]}> {
    const cmdParams = this.cmdParams[pluginId]
    if (!cmdParams) return {pass: false, message: 'Plugin parameters not cached'}

    group = group || 'default'

    if (!cmdParams[group] || cmdParams[group].length === 0) return {pass: true, replace: []} // No help strings, so ignore

    let maxValidDepth = 0
    let deepestIndex = 0

    const allChecks: Array<ReturnType<ParamValidator['check']>> = []

    for (let i = 0; i < cmdParams[group].length; i++) {
      const _cmdParams = cmdParams[group][i]
      const check = this.check(_cmdParams, words)
      allChecks.push(check)
      if (check.pass) {
        const replace: string[] = []
        const users: {[user: string]: number} = {}
        const duplicateUserIndexes = []
        for (let i = 0; i < _cmdParams.length; i++) {
          const pure = _cmdParams[i].pure
          if (typeof pure === 'string' && _cmdParams[i].var && this.checkables.includes(pure)) {
            // Check once or multiple times if multi param
            const checks = _cmdParams[i].multi ? words.length - 1 : 1
            for (let ii = 0; ii < checks; ii++) {
              const word = words[i + ii]
              const lc = word.toLowerCase()
              switch (pure) {
                case 'USERS':
                case 'USER':
                case 'CHANNEL':
                case 'CHANNELS':
                  if (users[lc] === undefined) users[lc] = i + ii
                  else duplicateUserIndexes.push(i + ii)
                  break
                case 'COMMAND':
                case 'COMMANDS':
                  if (!this.commander.getAlias(channelId, word)) {
                    return {pass: false, message: `No command with that name (param ${i + ii + 1})`}
                  }
                  replace[i + ii] = lc
                  break
                case '!COMMAND':
                case '!COMMANDS':
                  if (this.commander.getAlias(channelId, word)) {
                    return {pass: false, message: `There is already a command with that name (param ${i + ii + 1})`}
                  }
                  replace[i + ii] = lc
                  break
                case 'PLUGIN':
                case 'PLUGINS':
                  if (!this.commander.plugins[lc]) return {pass: false, message: `No plugin with that id (param ${i + ii + 1})`}
                  replace[i + ii] = lc
                  break
                case '!PLUGIN':
                case '!PLUGINS':
                  if (this.commander.plugins[lc]) return {pass: false, message: `There is already a plugin with that id (param ${i + ii + 1}`}
                  replace[i + ii] = lc
                  break
                default:
              }
            }
          } else { // Array
            if (!_cmdParams[i].var && !_cmdParams[i].case) {
              replace[i] = words[i].toLowerCase()
              console.log(words[i].toLowerCase())
            }
          }
        }

        // >add <COMMAND> <message>,edit <COMMAND> <message>,del <COMMAND>
        if (Object.keys(users).length) {
          const res = await this.client.api.getIds(Object.keys(users))

          const notFound: number[] = []

          for (const user in users) {
            if (!res[user]) notFound.push(users[user])
            else replace[users[user]] = `${res[user]}` // Change login to id
          }

          const allNotFound = uniquify([...notFound, ...duplicateUserIndexes.filter(i => !res[words[i]])], true).map(v => v + 1)
          if (notFound.length) return {pass: false, message: `Cannot find that ${plural(allNotFound.length, 'user', true)} (param ${allNotFound.join('|')})`}

          for (const index of duplicateUserIndexes) {
            const user = words[index]
            if (!res[user]) return {pass: false, message: `Unexpectedly no user id returned (param ${index + 1})`}
            else replace[index] = res[user] + ''
          }
        }

        return {pass: true, replace}
      }
      let depth = 0
      for (const bool of check.fields) {
        if (bool) depth++
        else break
      }
      if (depth > maxValidDepth) {
        maxValidDepth = depth
        deepestIndex = i
      }
    }

    // Find possible parameter names/types at depth
    let possibleCmdParams: CommandParameter[] = []
    for (let i = 0; i < allChecks.length; i++) {
      const check = allChecks[i]
      for (let ii = 0; ii < check.fields.length; ii++) {
        const field = check.fields[ii]
        if (!field) {
          if (ii === maxValidDepth) {
            possibleCmdParams.push(cmdParams[group][i][ii])
          }
          break
        }
      }
    }
    possibleCmdParams = uniquify(possibleCmdParams, false)

    // Get data for no param message
    const possibleNames = []
    let paramNeeded = true
    let allMultis = true
    for (const cmdParam of possibleCmdParams) {
      if (!cmdParam.multi) allMultis = false
      if (cmdParam.opt) paramNeeded = false

      if (cmdParam.var) {
        if (typeof cmdParam.pure === 'object') possibleNames.push(...cmdParam.pure.map(v => getName(v)))
        else possibleNames.push(getName(cmdParam.pure))
      } else possibleNames.push(...(typeof cmdParam.pure === 'object' ? cmdParam.pure.map(v => `"${v}"`) : [`"${cmdParam.pure}"`]))
    }
    if (!paramNeeded) possibleNames.unshift('nothing')

    if (possibleNames.length <= 1) {
      const invalid = cmdParams[group][deepestIndex][maxValidDepth]
      if (invalid.var) {
        const name = getName(invalid.pure)
        if (invalid.multi) return { pass: false, message: `Define ${name} (params ${maxValidDepth + 1}+)` }
        else return { pass: false, message: `Define ${name} (param ${maxValidDepth + 1})` }
      }
    }
    return {
      pass: false,
      message: allMultis
        ? `Params ${maxValidDepth + 1}+ must be ${commaPunctuate(possibleNames, ', ', ' or ')}`
        : `Param ${maxValidDepth + 1} must be ${commaPunctuate(possibleNames, ', ', ' or ')}`,
    }
    return {pass: false, message: 'Unhandled invalid parameters'}

    /** Converts types like NUMBER, USER to number, user */
    function getName(name: string | string[]) {
      if (typeof name === 'string') return main(name)
      else {
        return name.map(v => main(v)).join(', ')
      }
      function main(name: string) {
        switch (name) {
          case 'NUMBER':
            return 'a number'
          case 'NUMBERS':
            return 'numbers'
          case 'WORD':
            return 'a word'
          case 'WORDS':
            return 'words'
          case 'INTEGER':
            return 'a whole number'
          case 'INTEGERS':
            return 'whole numbers'
          case 'INDEX':
            return 'an index number'
          case 'INDEXES':
            return 'index numbers'
          case 'USER':
            return 'a user'
          case 'USERS':
            return 'users'
          case 'CHANNEL':
            return 'a channel'
          case 'CHANNELS':
            return 'channels'
          case 'COMMAND':
            return 'a command'
          case 'COMMANDS':
            return 'commands'
          case '!COMMAND':
            return 'an unexisting command'
          case '!COMMANDS':
            return 'unexisting commands'
          case 'PLUGIN':
            return 'a plugin'
          case 'PLUGINS':
            return 'plugins'
          case '!PLUGIN':
            return 'an unexisting plugin'
          case '!PLUGINS':
            return 'unexisting plugins'
          default:
            // Range (1-99, -Infinity-0)
            const splitNums = name.split(/(?<!-|^)-/).map(v => +v)
            if (splitNums.length > 1 && splitNums.every(v => typeof v === 'number' && !isNaN(v))) {
              const min = Math.min(...splitNums)
              const max = Math.max(...splitNums)
              const whole = !name.includes('.')
              if (min === -Infinity && max === Infinity) return 'number'
              if (min === -Infinity) return `${whole ? 'a whole' : 'any'} number less than or equal to ${max}`
              if (max === Infinity) return `${whole ? 'a whole' : 'any'} number more than or equal to ${min}`
              return `${whole ? 'a whole' : 'any'} number between ${min} and ${max}`
            }

            return addArticle(name.replace(/_/g, ' '))
        }
      }
    }
  }

  /**
   * Tests if `message` would meet the requirements of commands of `pluginId`
   * @param words Array of words sent by a user without the alias name (!command)
   * @param cmdParams commandParameters  
   */
  public check(cmdParams: CommandParameter[], words: string[], channelId?: number): { pass: boolean, fields: boolean[] } {
    let passes = true
    const results: boolean[] = []

    for (let i = 0; i < cmdParams.length; i++) {
      const field = cmdParams[i]

      let fail = !main(field, words[i], this.commander, channelId)

      if (field.multi) {
        for (const word of words.slice(i + 1)) {
          fail = !main(field, word, this.commander, channelId) || fail // Only set fail if error found
        }
      }

      results[i] = !fail
      if (fail) passes = false
    }

    return { pass: passes, fields: results }

    function main(field: CommandParameter, word: string, commander?: Commander, channelId?: number): boolean {
      if (typeof field.pure === 'object') { // Tuple
        if (!word) {
          if (!field.opt) return false
        } else {
          if (!field.var) { // Exact
            const input = field.case ? word : word.toLowerCase()
            if (field.pure.every(v =>  v !== input)) return false
          } else return !!types(field, word)
        }
      } else { // Non tuple
        if (!field.opt) { // Required
          if (!word) return false
          else {
            if (!field.var) { // Exact
              if (field.pure !== (field.case ? word : word.toLowerCase())) return false
            } else if (!types(field, word)) return false
          }
        } else { // Optional
          if (word) {
            if (!field.var) { // Exact
              if (field.pure !== (field.case ? word : word.toLowerCase())) return false
            } else if (!types(field, word)) return false
          }
        }
      }
      return true
    }

    /** Validate some types like NUMBER, INT, ranges etc */
    function types(field: CommandParameter, word: string): boolean {
      if (!field.var && typeof field.pure === 'object') return true
      if (typeof field.pure === 'object') {
        for (let i = 0; i < field.pure.length; i++) {
          const res = switcheroo(field.regex ? (field.regex as RegExp[])[i] : undefined, field.pure[i], word)
          if (res) return true
        }
        return false
      }
      return switcheroo(field.regex as RegExp | undefined, field.pure, word)

      function switcheroo(regex: RegExp | undefined, pure: string, word: string) {
        if (regex) return !!word.match(regex)
        switch (pure) {
          case 'NUMBER':
          case 'NUMBERS':
            return !isNaN(+word)
          case 'WORD':
          case 'WORDS':
            return isNaN(+word)
          case 'INTEGER':
          case 'INTEGERS':
          case 'INDEX':
          case 'INDEXES':
            return Number.isInteger(+word)
          default:
            // Range
            const splitNums = pure.split(/(?<!-|^)-/).map(v => +v)
            const whole = !pure.includes('.')
            if (splitNums.length > 1) {
              const inputNum = +word
              if (isNaN(inputNum)) return false
              if (whole && !Number.isInteger(inputNum)) return false
              if (inputNum < Math.min(...splitNums) || inputNum > Math.max(...splitNums)) return false
            }
            break
        }
        return true
      }
    }
  }

  /** Handle command plugins help field. Caching parameter types. Throws on invalid help strings */
  public cacheHelp(pluginId: string, help: Command['help']) {
    const res: {[group: string]: CommandParameters[]} = {}

    const source = Array.isArray(help) ? {default: help} : help

    for (const group in source) {
      res[group] = []

      for (const help of source[group]) {
        // Remove parts before first parameter
        if (!help.match(/.*: ?{?\w+}? ?/)) continue // Ignore if just explanation
        const clean = help.replace(/.*: ?{?\w+}? ?/, '')
        if (clean) res[group].push(this._parse(clean).data!)
        else res[group].push([]) // Fix no parameters (...: {alias})
        if (res[group][res[group].length - 1]) {
          const errors = this._errorCheck(res[group][res[group].length - 1])
          if (errors.length) throw new Error(errors.join('. '))
        }
      }
    }
    this.cmdParams[pluginId] = res
  }

  /** Returns an array of encountered syntactic errors in `cmdParams` */
  public _errorCheck(cmdParams: CommandParameters) {
    const errors = []
    let previous: CommandParameters[number] = {opt: false, var: false, multi: false, case: false, pure: '', raw: ''}
    for (const field of cmdParams) {

      const smaller = field.raw.split('<').length - 1
      const larger = field.raw.split('>').length - 1
      const leftSquare = field.raw.split('[').length - 1
      const rightSquare = field.raw.split(']').length - 1

      if (typeof field.pure) {
        for (const pure of field.pure) {
          if (!pure) errors.push(`Parameter name was falsy: ${pure}`)
          if (this.checkables.includes(pure)) errors.push(`Advanced variable ${pure} is forbidden in tuples`)
        }
      }

      if (smaller !== larger) errors.push(`The total occurrences of < and > do not match: ${field.raw}`)
      if (leftSquare !== rightSquare) errors.push(`The total occurrences of [ and ] do not match: ${field.raw}`)

      if (smaller > 1 || larger > 1) errors.push(`There can only be 0 or 2 occurrences of < or >: ${field.raw}`)
      if (leftSquare > 1 || rightSquare > 1) errors.push(`There can only be 0 or 2 occurrences of [ or ]: ${field.raw}`)

      if (!field.opt && previous.opt) errors.push('Required parameter after optional parameter')

      if (previous.multi) errors.push('Parameter after multi parameter')

      if ((field.raw.split('/').length - 1) % 2) errors.push("Use of '/' is preserved for regex in the format: name/regex/flags")

      previous = field
    }

    return errors
  }

  /**
   * Parses a help string and adds the result to memory for checking if no errors were found  
   * @param input Help string in the formats: <var> [optional...] OR Description of action: {command} <delete|add> <message...>
   */
  public _parse(input: string): AdvancedResult<CommandParameter[]> {
    const output: CommandParameters = []
    for (const raw of input.split(' ')) {
      const _var = !!raw.match(/^[\[\].]*\<.*\>[\[\].]*$/) // Has <>
      const opt = !!raw.match(/^[<>.]*\[.*\][<>.]*$/) // Has []
      const multi = !!raw.match(/\.{3}[\]>]*$/) // Has ...
      const _case = raw.toLowerCase() !== raw
      let regex: RegExp | RegExp[] | undefined
      // Edge tokens only: /^[[\]<>]+|(\.{3}|[[\]<>])+$/g
      // All tokens: /[\[\]<>.]+/g
      let pure: CommandParameter['pure'] = raw.replace(/^[[\]<>]+|(\.{3}|[[\]<>])+$/g, '') // Remove edge tokens
      if (raw.includes('|')) {

        pure = pure.split('|') // Tuple

        const _regex: RegExp[] = []
        const _pure: string[] = []
        pure.forEach((element, i) => {
          if (_var && element.includes('/')) {
            const split = element.split('/')
            _pure[i] = split[0]
            _regex[i] = new RegExp(split[1], split[2])
          } else _pure[i] = element
          if (_regex.length) regex = _regex
        })
        pure = _pure
      } else if (_var && raw.includes('/')) { // Regex
        const split = pure.split('/')
        pure = split[0]
        regex = new RegExp(split[1], split[2])
      }
      output.push({
        opt,
        var: _var,
        multi,
        case: _case,
        pure,
        raw,
        ...(regex ? {regex} : {}), // Can't have that extra key
      })
    }
    const validate = this._errorCheck(output)
    const success = !validate.length
    if (success) {
      return {success, data: output}
    }
    return {success, code: 'INVALID', message: validate.join('. '), data: output}
  }

  /**
   * Enable reading console input for testing parameter checking and validation  
   * \> + help string: Next tests will check against this  
   * < + test string: Get parameter complaint for users  
   * Test string: Check parameters against the help string  
   * 
   * Examples:  
   * Help string: >Show current time in city: {command} <city> \[12|24]  
   * Test strig: Tokyo 44  
   * Outputs: <city> (green) \[12|24] (red)
   */
  public consoleInteract() {
    const stdin: NodeJS.Socket = process.openStdin()

    let splitInputs = ['<test> [test...]'.split(' ')]
    let inputCmdParams = {default: [this._parse('<test> [test...]').data || []]}
    stdin.addListener('data', listener.bind(this))

    async function listener(this: ParamValidator, data: any) {
      const str: string = data.toString().trim()
      if (str.startsWith('>')) {
        const rawHelps = str.slice(1).split(',')
        const splits = str.slice(1).split(',').map(v => v.replace(/.*: ?{?\w+}? ?/, ''))
        splitInputs = splits.map(v => v.split(' '))
        inputCmdParams = {default: splits.map(v => this._parse(v).data || [])}
        try {
          this.cacheHelp('VALIDATOR_TEST', {default: rawHelps})
        } catch (err) {
          console.error(err.message)
        }
      } else if (str.startsWith('<')) {
        const res = await this.validate(61365582, 'VALIDATOR_TEST', 'default', str.slice(1).split(' '))
        if (res) console.log(res)
      } else {
        try {
          let logMsg = ''
          let i = 0
          for (const splitInput of splitInputs) {
            const res = this.check(inputCmdParams.default[i], str.split(' '))
            splitInput.forEach((v, i) => {
              if (res.fields[i] === true) logMsg += green(v) + ' '
              else if (res.fields[i] === false) logMsg += red(v) + ' '
              else logMsg += yellow(v) + ' '
            })
            logMsg += '\n'
            i++
          }
          logMsg = logMsg.slice(0, -1)
          console.log(logMsg)
        } catch (err) {
          console.error(err)
        }
      }
    }

    function red(str: string): string { return '\x1b[31m' + str + '\x1b[0m' }
    function yellow(str: string): string { return '\x1b[33m' + str + '\x1b[0m' }
    function green(str: string): string { return '\x1b[32m' + str + '\x1b[0m' }
  }

}
