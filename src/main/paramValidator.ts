
import TwitchClient from './client/client'
import Commander, { PluginInstance } from './commander'
import { addArticle, commaPunctuate, plural, uniquify } from './lib/util'

interface Bit {
  // Whether or not the field is optional
  opt: boolean
  // Whether or not the field is variable
  var: boolean
  // Whether or not the field is multi word
  multi: boolean
  // Whether or not the field is case sensitive
  case: boolean
  // Field without tokens and is an array if field is a tuple
  pure: string | string[]
  // Raw field with tokens
  raw: string
  // Possible compiled regex
  regex?: RegExp | RegExp[]
}

type Params = Bit[]
type Bundle = Params[]

type ValidateResult = {
  pass: true
  index: number
  values: any
} | {
  pass: false
  message: string
}

// WORST PIECE OF TRASH CODE BUT IT WORKS SO EAT IT

/**
 * Validates parameter and handles parameter checking for command plugins
 */
export default class ParamValidator {
  private commander: Commander
  private client: TwitchClient
  private cmdParams: {[pluginId: string]: {[group: string]: Bundle}}
  private checkables: string[]

  constructor(commander: Commander, client: TwitchClient) {
    this.commander = commander
    this.client = client
    this.cmdParams = {}

    this.checkables = ['USER', 'USERS', 'CHANNEL', 'CHANNELS', 'COMMAND', 'COMMANDS', '!COMMAND', '!COMMANDS', 'PLUGIN', 'PLUGINS', '!PLUGIN', '!PLUGINS']
  }

  /** Generates user readable output when usage is not valid */
  public async validate(channelId: number, pluginId: string, words: string[], group = 'default'): Promise<ValidateResult> {
    if (!this.cmdParams[pluginId]) return { pass: false, message: 'Plugin parameters not cached' }
    if (!this.cmdParams[pluginId][group]) return { pass: false, message: 'Plugin parameters not cached for group' }

    const grouped = this.cmdParams[pluginId]

    group = group || 'default'

    if (!grouped[group] || grouped[group].length === 0) return { pass: true, index: 0, values: [] } // No help strings, so ignore


    let maxValidDepth = 0
    let deepestIndex = 0

    const checks: Array<ReturnType<ParamValidator['check']>> = []

    for (let i = 0; i < grouped[group].length; i++) {
      const params = grouped[group][i]
      const check = this.check(params, words)
      checks.push(check)
      if (check.pass) {
        let values: any[] = []
        const users: {[user: string]: number} = {}
        const dupUserIndexes = []
        for (let i = 0; i < params.length; i++) {
          const pure = params[i].pure
          if (params[i].multi) values[i] = []
          else values[i] = words[i]
          if (typeof pure === 'string' && params[i].var && this.checkables.includes(pure)) {
            // Check once or multiple times if multi param
            const checks = params[i].multi ? words.length : 1
            for (let ii = 0; ii < checks; ii++) {
              const word = words[i + ii]
              if (!word) continue

              const lc = word.toLowerCase()
              switch (pure) {
                case 'USERS':
                case 'USER':
                case 'CHANNEL':
                case 'CHANNELS':
                  if (users[lc] === undefined) users[lc] = i + ii
                  else dupUserIndexes.push(i + ii)
                  break
                case 'COMMAND':
                case 'COMMANDS':
                  if (!this.commander.getAlias(channelId, word)) {
                    return { pass: false, message: `No command with that name (param ${i + ii + 1})` }
                  }
                  if (params[i].multi) values[i].push(lc)
                  else values[i] = lc
                  break
                case '!COMMAND':
                case '!COMMANDS':
                  if (this.commander.getAlias(channelId, word)) {
                    return { pass: false, message: `There is already a command with that name (param ${i + ii + 1})` }
                  }
                  if (params[i].multi) values[i].push(lc)
                  else values[i] = lc
                  break
                case 'PLUGIN':
                case 'PLUGINS':
                  if (!this.commander.plugins[lc]) return { pass: false, message: `No plugin with that id (param ${i + ii + 1})` }
                  if (params[i].multi) values[i].push(lc)
                  else values[i] = lc
                  break
                case '!PLUGIN':
                case '!PLUGINS':
                  if (this.commander.plugins[lc]) return { pass: false, message: `There is already a plugin with that id (param ${i + ii + 1}` }
                  if (params[i].multi) values[i].push(lc)
                  else values[i] = lc
                  break
                default:
              }
            }
          } else if (typeof check.rep[i] === 'undefined') {
            if (params[i].multi) {
              for (const word of words.slice(i)) {
                if (params[i].var) values[i].push(word)
                else values[i].push(params[i].case ? word : word ? word.toLowerCase() : undefined)
              }
            } else if (words[i]) {
              if (params[i].var) values[i] = words[i]
              else values[i] = params[i].case ? words[i] : words[i].toLowerCase()
            }
          }
        }

        const userRep: Array<number | undefined> = []
        // >add <COMMAND> <message>,edit <COMMAND> <message>,del <COMMAND>
        if (Object.keys(users).length) {
          const res = await this.client.api.getIds(Object.keys(users))

          const notFound: number[] = []

          for (const user in users) {
            if (res[user]) userRep[users[user]] = res[user] // Change login to id
            else notFound.push(users[user])
          }

          const allNotFound = uniquify([...notFound, ...dupUserIndexes.filter(i => !res[words[i]])], true).map(v => v + 1)
          if (notFound.length) return { pass: false, message: `Cannot find that ${plural(allNotFound.length, 'user', true)} (param ${allNotFound.join('|')})` }

          for (const index of dupUserIndexes) {
            const user = words[index]
            if (res[user]) userRep[index] = res[user]
            else return { pass: false, message: `Unexpectedly no user id returned (param ${index + 1})` }
          }
        }

        // Ending multi parameter
        let multiArray
        let iii = -1
        // check.rep: [0,1,2,3] + values: [0, []] -> [0, [1,2,3]]
        for (const rep of check.rep) {
          iii++
          if (typeof rep === 'undefined') continue
          if (Array.isArray(values[iii])) multiArray = values[iii]
          if (multiArray) multiArray.push(rep)
          else values[iii] = rep
        }

        /** Ending multi parameter */
        let multiArray2
        let iiii = -1
        // userRep: [034532,1123456457,2234234,3234234] + values: [0, []] -> [04662545, [12342342,234635134,33453416]]
        for (const rep of userRep) {
          iiii++
          if (typeof rep === 'undefined') continue
          if (Array.isArray(values[iiii])) multiArray2 = values[iiii]
          if (multiArray2) multiArray2.push(rep)
          else values[iiii] = rep
        }
        values = values.map((v, i) => v === undefined ? check.rep[i] : v)

        for (let i = 0; i < values.length; i++) {
          if (Array.isArray(values[i]) && !values[i].length) values[i] = undefined // Make empty array params undefined
        }

        return { pass: true, index: i, values }
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
    let possibleCmdParams: Params = []
    for (let i = 0; i < checks.length; i++) {
      const check = checks[i]
      for (let ii = 0; ii < check.fields.length; ii++) {
        const field = check.fields[ii]
        if (!field) {
          if (ii === maxValidDepth) {
            possibleCmdParams.push(grouped[group][i][ii])
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
        if (typeof cmdParam.pure === 'object') possibleNames.push(...cmdParam.pure.map(v => getName(v, cmdParam.multi)))
        else possibleNames.push(getName(cmdParam.pure, cmdParam.multi))
      } else {
        possibleNames.push(...typeof cmdParam.pure === 'object' ? cmdParam.pure.map(v => `"${v}"`) : [`"${cmdParam.pure}"`])
      }
    }
    if (!paramNeeded) possibleNames.unshift('nothing')

    if (possibleNames.length <= 1) {
      const invalid = grouped[group][deepestIndex][maxValidDepth]
      if (invalid.var) {
        const name = getName(invalid.pure, invalid.multi)
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
    return { pass: false, message: 'Unhandled invalid parameters' }

    /** Converts types like NUMBER, USER to number, user */
    function getName(name: string | string[], multi: boolean) {
      if (typeof name === 'string') return main(name, multi)
      else return name.map(v => main(v, multi)).join(', ')
      function main(name: string, multi: boolean) {
        switch (name) {
          case 'NUMBER': return 'a number'
          case 'NUMBERS': return 'numbers'
          case 'WORD': return 'a word'
          case 'WORDS': return 'words'
          case 'INTEGER': return 'a whole number'
          case 'INTEGERS': return 'whole numbers'
          case 'INDEX': return 'an index number'
          case 'INDEXES': return 'index numbers'
          case 'USER': return 'a user'
          case 'USERS': return 'users'
          case 'CHANNEL': return 'a channel'
          case 'CHANNELS': return 'channels'
          case 'COMMAND': return 'a command'
          case 'COMMANDS': return 'commands'
          case '!COMMAND': return 'an unexisting command'
          case '!COMMANDS': return 'unexisting commands'
          case 'PLUGIN': return 'a plugin'
          case 'PLUGINS': return 'plugins'
          case '!PLUGIN': return 'an unexisting plugin'
          case '!PLUGINS': return 'unexisting plugins'
          default: {
            // Range (1-99, -Infinity-0)
            const splitNums = name.split(/(?<!-|^)-/).map(v => Number(v))
            if (splitNums.length > 1 && splitNums.every(v => typeof v === 'number' && !isNaN(v))) {
              const min = Math.min(...splitNums)
              const max = Math.max(...splitNums)
              const whole = !name.includes('.')
              if (min === -Infinity && max === Infinity) return 'number'
              if (min === -Infinity) return `${whole ? 'a whole' : 'any'} number less than or equal to ${max}`
              if (max === Infinity) return `${whole ? 'a whole' : 'any'} number more than or equal to ${min}`
              return `${whole ? 'a whole' : 'any'} number between ${min} and ${max}`
            }

            // Add article to names that seem like non plural forms
            return name.endsWith('s') || name.endsWith('\'') ? name.replace(/_/g, ' ') : addArticle(name.replace(/_/g, ' '))
          }
        }
      }
    }
  }

  /**
   * Tests if `message` would meet the requirements of commands of `pluginId`
   * @param words Array of words sent by a user without the alias name (!command)
   * @param cmdParams commandParameters  
   */
  public check(cmdParams: Params, words: string[], channelId?: number): { pass: boolean, fields: boolean[], rep: any[] } {
    let passes = true
    const resFields: boolean[] = []
    const rep: any[] = []

    for (let i = 0; i < cmdParams.length; i++) {
      const field = cmdParams[i]

      const res = main(field, words[i], this.commander, channelId)
      rep.push(res.rep)

      let fail = !res.pass

      if (field.multi) {
        for (const word of words.slice(i + 1)) {
          const res = main(field, word, this.commander, channelId)
          rep.push(res.rep)
          fail = !res.pass || fail // Only set fail if error found
        }
      }

      resFields[i] = !fail
      if (fail) passes = false
    }

    return { pass: passes, fields: resFields, rep }

    function main(field: Bit, word: string, commander?: Commander, channelId?: number): {pass: boolean, rep?: any} {
      if (typeof field.pure === 'object') { // Tuple
        if (!word) {
          if (!field.opt) return { pass: false }
        } else if (field.var) { // Variable
          return types(field, word)
        } else {
          const input = field.case ? word : word.toLowerCase()
          if (field.pure.every(v => v !== input)) return { pass: false }
        }
      } else if (field.opt) { // Non-tuple and optional
        if (word) {
          if (field.var) { // Variable
            return types(field, word)
          } else if (field.pure !== (field.case ? word : word.toLowerCase())) { return { pass: false } }
        }
      } else if (!word) {
        return { pass: false }
      } else if (field.var) { // Variable
        return types(field, word)
      } else if (field.pure !== (field.case ? word : word.toLowerCase())) { return { pass: false } }
      return { pass: true }
    }

    /** Validate some types like NUMBER, INT, ranges etc */
    function types(field: Bit, word: string): {pass: boolean, rep?: any} {
      if (!field.var && typeof field.pure === 'object') return { pass: true }
      if (typeof field.pure === 'object') {
        for (let i = 0; i < field.pure.length; i++) {
          const res = switcheroo(field.regex ? (field.regex as RegExp[])[i] : undefined, field.pure[i], word)
          return res
        }
        return { pass: false }
      }
      return switcheroo(field.regex as RegExp | undefined, field.pure, word)

      function switcheroo(regex: RegExp | undefined, pure: string, word: string): {pass: boolean, rep?: any} {
        if (regex) return { pass: Boolean(word.match(regex)) }
        switch (pure) {
          case 'NUMBER':
          case 'NUMBERS': {
            const res = Number(word)
            return { pass: !isNaN(res), rep: res }
          }
          case 'WORD':
          case 'WORDS':
            return { pass: isNaN(Number(word)) }
          case 'INTEGER':
          case 'INTEGERS':
          case 'INDEX':
          case 'INDEXES': {
            const res = Number(word)
            return { pass: Number.isInteger(res), rep: res }
          }
          default: {
            // Range
            const splitNums = pure.split(/(?<!-|^)-/).map(v => Number(v))
            const whole = !pure.includes('.')
            if (splitNums.length > 1) {
              const inputNum = Number(word)
              if (isNaN(inputNum)) return { pass: false, rep: inputNum }
              if (whole && !Number.isInteger(inputNum)) return { pass: false, rep: inputNum }
              if (inputNum < Math.min(...splitNums) || inputNum > Math.max(...splitNums)) return { pass: false, rep: inputNum }
              return { pass: true, rep: inputNum }
            }
            break
          }
        }
        return { pass: true }
      }
    }
  }

  /** Removed `pluginId` parameters from cache */
  public uncacheHelp(pluginId: string) {
    delete this.cmdParams[pluginId]
  }

  /** Handle command plugin's instance#call field. Caching parameter types. Throws on invalid params strings */
  public cacheHelp(pluginId: string, call: PluginInstance['call']) {
    const res: {[group: string]: Bundle} = {}

    const source = call

    for (const group in source) {
      res[group] = []

      for (const grouped of source[group]) {
        const help = grouped.params
        if (help) res[group].push(this.parse(help).data!)
        else res[group].push([]) // Fix no parameters (...: {alias})
        if (res[group][res[group].length - 1]) {
          const errors = this.errorCheck(res[group][res[group].length - 1])
          if (errors.length) throw new Error(`${pluginId}: ${errors.join('. ')}`)
        }
      }
    }
    this.cmdParams[pluginId] = res
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
    let inputCmdParams = { default: [this.parse('<test> [test...]').data || []] }
    stdin.addListener('data', listener.bind(this))

    async function listener(this: ParamValidator, data: any) {
      const str: string = data.toString().trim()
      if (str.startsWith('>')) {
        const rawHelps = str.slice(1).split(',')
        const splits = str.slice(1).split(',')
        splitInputs = splits.map(v => v.split(' '))
        inputCmdParams = { default: splits.map(v => this.parse(v).data || []) }
        try {
          const converted: PluginInstance['call'] = {
            default: rawHelps.map((v) => {
              return {
                params: v,
                handler: async (d: any, ...args: any[]) => { void 0 },
              }
            }),
          }
          this.cacheHelp('VALIDATOR_TEST', converted)
        } catch (err) {
          console.error(err.message)
        }
      } else if (str.startsWith('<')) {
        const res = await this.validate(61365582, 'VALIDATOR_TEST', str.slice(1).split(' '))
        if (res) console.log(res)
      } else {
        try {
          let logMsg = ''
          let i = 0
          for (const splitInput of splitInputs) {
            const res = this.check(inputCmdParams.default[i], str.split(' '))
            splitInput.forEach((v, i) => {
              if (res.fields[i] === true) logMsg += `${green(v)} `
              else if (res.fields[i] === false) logMsg += `${red(v)} `
              else logMsg += `${yellow(v)} `
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

    function red(str: string): string { return `\x1b[31m${str}\x1b[0m` }
    function yellow(str: string): string { return `\x1b[33m${str}\x1b[0m` }
    function green(str: string): string { return `\x1b[32m${str}\x1b[0m` }
  }

  /** Returns an array of encountered syntactic errors in `cmdParams` */
  private errorCheck(cmdParams: Params) {
    const errors = []
    let previous: Params[number] = { opt: false, var: false, multi: false, case: false, pure: '', raw: '' }
    for (const field of cmdParams) {
      const smaller = field.raw.split('<').length - 1
      const larger = field.raw.split('>').length - 1
      const leftSquare = field.raw.split('[').length - 1
      const rightSquare = field.raw.split(']').length - 1

      if (typeof field.pure === 'object') {
        if (field.regex) errors.push('Regex parameter in tuple is disallowed')
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

      if ((field.raw.split('/').length - 1) % 2) errors.push('Use of \'/\' is preserved for regex in the format: name/regex/flags')

      previous = field
    }

    return errors
  }

  /**
   * Parses a help string and adds the result to memory for checking if no errors were found  
   * @param input Help string in the formats: <var> [optional...] OR Description of action: {command} <delete|add> <message...>
   */
  private parse(input: string): AdvancedResult<Params> {
    const output: Params = []
    for (const raw of input.split(' ')) {
      const _var = Boolean(raw.match(/^[\[\].]*\<.*\>[\[\].]*$/)) // Has <>
      const opt = Boolean(raw.match(/^[<>.]*\[.*\][<>.]*$/)) // Has []
      const multi = Boolean(raw.match(/\.{3}[\]>]*$/)) // Has ...
      const _case = raw.toLowerCase() !== raw
      let regex: RegExp | RegExp[] | undefined
      // Edge tokens only: /^[[\]<>]+|(\.{3}|[[\]<>])+$/g
      // All tokens: /[\[\]<>.]+/g
      let pure: Bit['pure'] = raw.replace(/^[\[\]<>]+|(\.{3}|[\[\]<>])+$/g, '') // Remove edge tokens
      if (raw.includes('|')) {
        pure = pure.split('|') // Tuple

        const _regex: RegExp[] = []
        const _pure: string[] = []
        pure.forEach((element, i) => {
          if (_var && element.includes('/')) {
            const split = element.split('/')
            _pure[i] = split[0]
            _regex[i] = new RegExp(split[1], split[2])
          } else {
            _pure[i] = element
          }
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
        ...regex ? { regex } : {}, // Can't have that extra key
      })
    }

    const validate = this.errorCheck(output)
    const success = !validate.length
    if (success) {
      return { success, data: output }
    }
    return { success, code: 'INVALID', message: validate.join('. '), data: output }
  }
}
