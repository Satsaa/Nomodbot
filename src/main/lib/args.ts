import { uniquify } from './util'

export interface ArgsOptions {
  /** Use these arguments instead of `process.argv` */
  args?: string[]
  /** Output errors and exit if errors are encountered */
  strict?: boolean
  /** Don't use builtin help functionality */
  noHelp?: boolean
  /** Don't show usage with --help with no value */
  smallHelp?: boolean
  /** Extra messages shown at the bottom when using --help with no value */
  helpUsage?: string[]
  /** Rules and more for arguments */
  rules: {
    [main: string]: {
      /** Secondary command aliases */
      aliases?: string[]
      /** Mix of argument usage and usage description */
      usage?: string[]
      /** Require value to match provided type */
      value?: 'any' | 'number' | 'integer' | 'boolean'
      /** Require value to be defined */
      requireValue?: boolean
      /** Require that no value is defined */
      noValue?: boolean
      /** Require other arguments to be present. Use main names */
      requireArgs?: string[]
    }
  }
}


interface Result {
  /** Arguments and their values */
  args: {[arg: string]: string[]}
  /** Values that weren't paired with an option */
  strays: string[]
  /** Errors encountered */
  errors: string[]
}

/**
 * Parses the current process' arguments and handles --help  
 */
export default class Args {
  public options: ArgsOptions;
  public args: Result['args'];
  public strays: Result['strays'];
  public errors: Result['errors'];
  constructor(options: ArgsOptions) {
    this.options = options

    const result = this.parse(options)
    this.args = result.args
    this.strays = result.strays
    this.errors = result.errors

    if (options.strict && result.errors.length) {
      console.log(result.errors.join('\n'))
      process.exit(1)
    }

    if (!options.noHelp && result.args.help) {
      this.help(result.args.help[0])
    }
  }

  /** Make help string */
  public help(target?: string) {
    const aliasSpread: {[alias: string]: ArgsOptions['rules'][number]} = {}
    for (const main in this.options.rules) {
      const arg = this.options.rules[main]
      aliasSpread[main] = arg
      if (!arg.aliases) continue
      for (const alias of arg.aliases) {
        aliasSpread[alias] = arg
      }
    }

    if (target) {
      if (aliasSpread[target]) { // Help for single argument
        console.log(`${(aliasSpread[target].usage || []).join('\n')}`)
        if (aliasSpread[target].aliases) console.log(`\nAliases: ${aliasSpread[target].aliases!.join(', ')}`)
      } else { // Unknown argument or --help
        if (target === 'help' || target === 'h') console.log(`${' '.repeat(4)}${target.padEnd(16)}help [<arg>]`)
        else console.log(`Unknown argument ${target}. Make sure you omit leading hyphens`)
        process.exit(1)
      }
    } else {
      if (this.options.smallHelp) { // Small list
        console.log(`Available commands:\n${fit(Object.keys(aliasSpread))}`)
      } else { // Big list with usage
        for (const main in this.options.rules) {
          console.log(`\n${' '.repeat(4)}${main.padEnd(16)}${(aliasSpread[main].usage || []).join(`\n${' '.repeat(20)}`)}`)
        }
      }
      if (this.options.helpUsage) console.log(`\n${this.options.helpUsage.join('\n')}`)
    }
    process.exit(0)

    function fit(args: string[]) {
      const maxLength = 60
      const startPad = 4
      const delim = ', '

      const lines: string[][] = [[]]

      let currentLine = 0
      let lineLength = -delim.length
      for (const arg of args) {
        if (lineLength + arg.length + delim.length <= maxLength) { // Fits
          lines[currentLine].push(arg)
          lineLength += arg.length + delim.length
        } else { // Next line
          currentLine++
          lineLength = 0
          lines[currentLine] = []
          lines[currentLine].push(arg)
          lineLength += arg.length + delim.length
        }
      }

      let res = ''
      for (const line of lines) {
        res += `${' '.repeat(startPad)}${line.join(delim)}\n`
      }
      return res
    }
  }


  /**
   * Parser for command line arguments  
   * Tries to follow the posix conventions  
   * Syntax is -o (value) --option (value). --option=value is not supported  
   * @param args Array of string arguments  
   * @param options   
   */
  private parse(options: ArgsOptions): Result {
    const result: Result = { args: {}, strays: [], errors: [] }


    const aliasSpread: {[alias: string]: ArgsOptions['rules'][number]} = {}
    for (const main in options.rules) {
      const arg = options.rules[main]
      aliasSpread[main] = arg
      if (!arg.aliases) continue
      for (const alias of arg.aliases) {
        aliasSpread[alias] = arg
      }
    }

    let prevOpt: undefined | string
    for (const arg of options.args || process.argv) {
      if (arg.startsWith('-') && !arg.startsWith('--')) { // Short argument(s)
        if (arg.length === 1) { // Invalid
          result.errors.push('Invalid argument "-"')
          prevOpt = undefined
        } else if (arg.length === 2) { // Single (value allowed)
          const pure = arg.slice(1)
          if (getMain(pure)) result.args[getMain(pure)!] = result.args[getMain(pure)!] || [] // Preserve
          else result.errors.push(`-${pure} unknown argument`)
          prevOpt = getMain(pure) || pure
        } else { // Multi (-abcdef)
          for (const char of arg.slice(1)) {
            if (getMain(char)) result.args[getMain(char)!] = result.args[getMain(char)!] || [] // Preserve
            else result.errors.push(`-${char} unknown argument`)
            prevOpt = undefined
          }
        }
      } else if (arg.startsWith('--')) { // Long argument
        if (arg.length === 2) { // Invalid
          result.errors.push('Invalid argument "--"')
          prevOpt = undefined
        } else { // Valid
          const pure = arg.slice(2)
          if (getMain(pure)) result.args[getMain(pure)!] = result.args[getMain(pure)!] || [] // Preserve
          else result.errors.push(`--${pure} unknown argument`)
          prevOpt = getMain(pure) || pure
        }
      } else if (prevOpt) { // Value
        result.args[prevOpt].push(arg)
      } else { // Stray
        result.strays.push(arg)
      }
    }


    for (const main in result.args) {
      if (options.rules[main]) {
        const rule = options.rules[main]
        if (rule.noValue && result.args[main].length) result.errors.push(`${this.getSuffix(main)}${main} requires no value`)
        if (rule.requireValue && !result.args[main].length) result.errors.push(`${this.getSuffix(main)}${main} requires a value`)

        if (rule.requireArgs) {
          for (const req of rule.requireArgs) {
            if (!result.args[req]) result.errors.push(`${this.getSuffix(main)}${main} requires ${this.getSuffix(req)}${req} to be present`)
          }
        }

        if (rule.value && rule.value !== 'any') {
          for (const value of result.args[main]) {
            switch (rule.value) { // 'any' | 'number' | 'integer' | 'boolean'
              case 'number':
                if (!value.match(/^\d+(.?\d+)?$/)) result.errors.push(`Values for ${this.getSuffix(main)}${main} must be numbers`)
                break
              case 'integer':
                if (!value.match(/\d+/))result.errors.push(`Values for ${this.getSuffix(main)}${main} must be integers`)
                break
              case 'boolean':
                if (value !== 'true' && value !== 'false') result.errors.push(`Values for ${this.getSuffix(main)}${main} must be booleans`)
                break
            }
          }
        }
      }
    }


    result.errors = uniquify(result.errors, true)

    return result

    function getMain(aliasOrMain: string) {
      if (!options.noHelp && (aliasOrMain === 'help' || aliasOrMain === 'h')) return 'help'
      return getKeyByValue(options.rules, aliasSpread[aliasOrMain])
    }
    function getKeyByValue(object: {[x: string]: any}, value: any) {
      return Object.keys(object).find(key => object[key] === value)
    }
  }

  private getSuffix(main: string) {
    return main.length === 1 ? '-' : '--'
  }
}
