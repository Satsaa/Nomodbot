import { deduplicate, commaPunctuate, addArticle } from './util'

export interface ArgsOptions {
  /** Use these arguments instead of `process.argv` */
  readonly args?: readonly string[]
  /** Don't use builtin help functionality. Process exits if --help is used */
  readonly noHelp?: boolean
  /** Don't show usage with --help with no value */
  readonly smallHelp?: boolean
  /** Extra messages shown at the bottom when using --help with no value */
  readonly helpUsage?: readonly string[]
  /** Put extra values in to strays instead of returning errors */
  readonly allowExtraValues?: boolean
  /** Rules and more for arguments */
  readonly rules: {
    readonly [main: string]: {
      /** Secondary command aliases */
      readonly aliases?: readonly string[]
      /** Mix of argument usage and usage description */
      readonly usage?: readonly string[]
      /** 
       * Require value to match provided type. Provide an array of strings to restrict values.
       * Values are handled as strings by default 
       * 
       * When a function is provided, each value is validated by it.
       * If the function returns undefined the value is rejected, otherwise the return value replaces the value.
       * Use `typeError` for custom errors when the validator function rejects the value.
       */
      readonly type?: 'number' | 'integer' | 'boolean' | readonly string[] | ((v: string) => any)
      /** If a validator function was defined for `type` and the value is rejected, give this error message  */
      readonly typeError?: string
      /** Value requirements. Optional is default */
      readonly value?: 'required' | 'optional' | 'never'
      /** Whether or not to accept multiple values */
      readonly multi?: boolean
      /** Require other arguments to be present. Use main names */
      readonly requireArgs?: readonly string[]
    }
  }
}

type Multize<T, M> = M extends true ? T[] : [T]

type Optionalize<T1, V, M> =
  V extends 'required' ? Multize<T1, M>
    : V extends 'optional' ? Multize<T1, M> | []
      : V extends 'never' ? []
        : Multize<T1, M> | []

type Validitize<T extends (v: string) => any, V, M> =
  keyof ReturnType<T> extends any ? Optionalize<Exclude<ReturnType<T>, undefined>, V, M>
    : keyof ReturnType<T> extends undefined ? Optionalize<Exclude<ReturnType<T>, undefined>, V, M>
      : Multize<ReturnType<T>, M>

type Typify<T, V, M> =
  T extends 'number' ? Optionalize<number, V, M>
    : T extends 'integer' ? Optionalize<number, V, M>
      : T extends 'boolean' ? Optionalize<boolean, V, M>
        : T extends readonly string[] ? Optionalize<T[number], V, M>
          : T extends (v: string) => any ? Validitize<T, V, M>
            : Optionalize<string, V, M>

/**
 * Parses command line arguments. Tries to follow posix conventions.  
 * Syntax is like `-o` *value* `--option` *value*. --option=*value* is not supported.  
 * @param options Use *const* `{ args:[], rules: { ... } } as const`
 * @return array of errors or object with `args` and `strays` properties:  
 * `args`: Contains an array of values (0 or more) for every defined option.  
 * `strays`: Array of arguments that did not get paired with an option.  
 */
export default function parse<T extends ArgsOptions>(options: T | ArgsOptions): string[] | {
  /** Arguments and their values */
  args: { [P in keyof T['rules']]?: Typify<T['rules'][P]['type'], T['rules'][P]['value'], T['rules'][P]['multi']> }
  /**
   * Values that weren't paired with an option.  
   * Usually contains the target path and possibly extra values.
   */
  strays: string[]
} {
  const result: { args: {[arg: string]: any[]}, strays: string[] } = { args: {}, strays: [] }
  const errors = []

  const aliasSpread: {[alias: string]: ArgsOptions['rules'][number]} = {}
  const aliases: string[] = []
  for (const main in options.rules) {
    aliases.push(main)

    const arg = options.rules[main]
    aliasSpread[main] = arg
    if (!arg.aliases) continue
    for (const alias of arg.aliases) {
      aliases.push(alias)
      aliasSpread[alias] = arg
    }
  }
  if (deduplicate(aliases, true).length !== aliases.length) {
    errors.push('Invalid argument "-"')
  }

  const a = deduplicate([1, 2, 3] as const, true)

  let prevOpt: undefined | string
  for (const arg of options.args || process.argv) {
    if (arg.startsWith('-') && !arg.startsWith('--')) { // Short argument(s)
      if (arg.length === 1) { // Invalid
        errors.push('Invalid argument "-"')
        prevOpt = undefined
      } else if (arg.length === 2) { // Single (value allowed)
        const pure = arg.slice(1)
        if (getMain(pure)) result.args[getMain(pure)!] = result.args[getMain(pure)!] || [] // Preserve
        else errors.push(`-${pure} unknown argument`)
        prevOpt = getMain(pure) || pure
      } else { // Multi (-abcdef)
        for (const char of arg.slice(1)) {
          if (getMain(char)) result.args[getMain(char)!] = result.args[getMain(char)!] || [] // Preserve
          else errors.push(`-${char} unknown argument`)
          prevOpt = undefined
        }
      }
    } else if (arg.startsWith('--')) { // Long argument
      if (arg.length === 2) { // Invalid
        errors.push('Invalid argument "--"')
        prevOpt = undefined
      } else { // Valid
        const pure = arg.slice(2)
        if (getMain(pure)) result.args[getMain(pure)!] = result.args[getMain(pure)!] || [] // Preserve
        else errors.push(`--${pure} unknown argument`)
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

      if (!rule.multi && result.args[main].length > 1) {
        if (!options.allowExtraValues) errors.push(`${getSuffix(main)}${main} does not accept multiple values`)
        result.strays.push(...result.args[main].splice(1))
      }

      if (rule.value === 'never' && result.args[main].length) errors.push(`${getSuffix(main)}${main} requires no value`)
      if (rule.value === 'required' && !result.args[main].length) {
        if (Array.isArray(rule.type)) {
          errors.push(`${getSuffix(main)}${main} requires a value that is "${commaPunctuate(rule.type, '", "', '" or "')}"`)
        } else if (typeof rule.type === 'string') {
          errors.push(`${getSuffix(main)}${main} requires ${addArticle(rule.type)} value`)
        } else {
          errors.push(`${getSuffix(main)}${main} requires a value`)
        }
      }

      if (rule.requireArgs) {
        for (const req of rule.requireArgs) {
          if (!result.args[req]) errors.push(`${getSuffix(main)}${main} requires ${getSuffix(req)}${req} to be present`)
        }
      }

      if (rule.type) {
        const vals: any[] = []
        for (const value of result.args[main]) {
          switch (typeof rule.type) {
            case 'function': {
              const res = rule.type(value)
              if (res === undefined) errors.push(rule.typeError || `Value "${value}" is invalid for ${getSuffix(main)}${main}`)
              vals.push(res)
              break
            }
            case 'object': // Array
              if (!rule.type.includes(value)) {
                if (rule.multi) errors.push(`Values for ${getSuffix(main)}${main} must be "${commaPunctuate(rule.type, '", "', '" or "')}"`)
                else errors.push(`Value for ${getSuffix(main)}${main} must be "${commaPunctuate(rule.type, '", "', '" or "')}"`)
              }
              vals.push(value)
              break
            case 'string':
              switch (rule.type) {
                case 'number':
                  if (!value.match(/^\d+(.?\d+)?$/)) {
                    if (rule.multi) errors.push(`Values for ${getSuffix(main)}${main} must be numbers`)
                    else errors.push(`Value for ${getSuffix(main)}${main} must be a number`)
                  }
                  vals.push(Number(value))
                  break
                case 'integer':
                  if (!value.match(/\d+/)) {
                    if (rule.multi) errors.push(`Values for ${getSuffix(main)}${main} must be integers`)
                    else errors.push(`Value for ${getSuffix(main)}${main} must be an integer`)
                  }
                  vals.push(~~value)
                  break
                case 'boolean':
                  if (value !== 'true' && value !== 'false' && value !== '1' && value !== '0') {
                    if (rule.multi) errors.push(`Values for ${getSuffix(main)}${main} must be booleans`)
                    else errors.push(`Value for ${getSuffix(main)}${main} must be a boolean`)
                  }
                  vals.push(value === 'true' || value === '1')
                  break
              }
              break
          }
        }
        result.args[main] = vals
      }
    }
  }


  if (errors.length) {
    return deduplicate(errors, true)
  }

  if (!options.noHelp && result.args.help) {
    help(result.args.help[0])
  }

  return result as any

  function getMain(aliasOrMain: string) {
    if (!options.noHelp && (aliasOrMain === 'help' || aliasOrMain === 'h')) return 'help'
    return getKeyByValue(options.rules, aliasSpread[aliasOrMain])
  }
  function getKeyByValue(object: {[x: string]: any}, value: any) {
    return Object.keys(object).find(key => object[key] === value)
  }
  function getSuffix(main: string) {
    return main.length === 1 ? '-' : '--'
  }

  /** Make help string */
  function help(target?: string) {
    const aliasSpread: {[alias: string]: ArgsOptions['rules'][number]} = {}
    for (const main in options.rules) {
      const arg = options.rules[main]
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
      if (options.smallHelp) { // Small list
        console.log(`Available commands:\n${fit(Object.keys(aliasSpread))}`)
      } else { // Big list with usage
        for (const main in options.rules) {
          console.log(`\n${' '.repeat(4)}${main.padEnd(16)}${(aliasSpread[main].usage || []).join(`\n${' '.repeat(20)}`)}`)
        }
      }
      if (options.helpUsage) console.log(`\n${options.helpUsage.join('\n')}`)
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
}

/** Creates an array where `main` and **all** immediately following values are removed from `args`. */
export function removeOption(main: string, args: readonly string[], rules: ArgsOptions) {
  const aliases = [...rules.rules[main].aliases || [], main]

  const res = []
  let removeNext = false

  for (const arg of args) {
    if (arg.startsWith('-')) {
      if (arg.startsWith('--')) {
        if (aliases.includes(arg.slice(2))) {
          removeNext = true
        } else {
          res.push(arg)
          removeNext = false
        }
      } else {
        const matches = []
        for (const char of arg.slice(1)) {
          if (aliases.includes(char)) {
            matches.push(char)
          }
        }
        if (arg.length > 2) {
          if (matches.length) {
            let _arg = arg
            for (const match of matches) {
              _arg = _arg.replace(match, '')
            }
            if (_arg.length > 2) {
              res.push(_arg)
            } else {
              res.push(_arg)
              console.log(arg)
              removeNext = true
              continue
            }
          } else {
            res.push(arg)
          }
          removeNext = false
        } else if (matches.length) {
          removeNext = true
        } else {
          res.push(arg)
          removeNext = false
        }
      }
    } else if (!removeNext) { res.push(arg) }
  }
  return res
}
