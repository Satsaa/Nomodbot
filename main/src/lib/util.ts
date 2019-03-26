import { EventEmitter } from 'events'
import { promises as fsp } from 'fs'
import * as path from 'path'

/**
 * Returns a random integer between `min` and `max`
 * @param min Minimum possible output
 * @param max Maximum possible output
 */
export function randomInt(min: number, max: number) { return Math.floor(Math.random() * (Math.floor(max + 1) - (min = Math.ceil(min)))) + min }

/**
 * Returns a random float between `min` and `max`
 * @param min Minimum possible output
 * @param max Maximum possible output
 */
export function randomFloat(min: number, max: number) { return (Math.random() * (max - min)) + min }

/**
 * Returns first value that is not undefined
 * @param `values`
 */
export function get(...values: any[]) { for (const key of values) { if (key !== undefined) return key } }

/**
 * Returns `singular` or `plural` based on `value`
 * @param v If this is 1 or '1' `singular` is returned
 * @param singular Singular form
 * @param plural Plural form. Defaults to `singular + 's'`
 */
export function plural(v: string | number, singular: string, plural?: string) { return (v === 1 || v === '1' ? singular : plural || singular + 's') }

const onExitCbs: Array<(code: number) => void> = []
const signals = ['exit', 'SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBUS', 'SIGFPE', 'SIGSEGV', 'SIGILL', 'SIGUSR1', 'SIGUSR2', 'SIGQUIT', 'uncaughtException']
signals.forEach((signal: any) => {
  process.on(signal, (code) => {
    onExitCbs.forEach((cb) => {cb(code)})
    process.exit(code)
  })
})
/**
 * Attempts to excecute `cb` when the script is exiting.  
 * Does process.exit(code) after callbacks are finished
 * @param cb Synchronous callback
 */
export function onExit(cb: (code: number) => void) { onExitCbs.push(cb) }

/**
 * Finds all files in `dir` and its subfolders recursively  
 * File paths may not converted by the Typescript compiler so use the __module variable to build dynamic file paths
 * @param dir A directory path
 */
export async function readDirRecursive(dir: string, allFiles: string[] = []) {
  const files = (await fsp.readdir(dir)).map(file => path.resolve(dir, file))
  allFiles.push(...files)
  await Promise.all(files.map(async file => (
    (await fsp.stat(file)).isDirectory() && readDirRecursive(file, allFiles)
  )))
  return allFiles
}

/**
 * Promise setTimeout
 * @param ms Wait duration
 */
export function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

/**
 * Resolve on event or on timeout
 * @param emitter Emitter instance
 * @param event Event
 * @param options `options.timeout` Resolve if timeout executes before the event fires.
 * `options.args` Resolve only if the event returns atleast these arguments and the values match
 * @returns Arguments received from the event as an array
 */
export function onEvent(emitter: EventEmitter, event: string, options: {timeout?: number, args?: any[] } = {}): Promise<any[]> {
  return new Promise((resolve) => {
    const cbFunc = (...args: any[]) => {
      if (options.args) {
        let i = 0
        for (const expected of options.args) {
          if (arguments[i++] !== expected) return
        }
      }
      emitter.removeListener(event, cbFunc)
      clearTimeout(timeout)
      resolve(args)
    }
    let timeout: NodeJS.Timeout
    if (options.timeout !== undefined) timeout = setTimeout(cbFunc, options.timeout)
    emitter.on(event, cbFunc)
  })
}
