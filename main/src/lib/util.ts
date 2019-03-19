import * as fs from 'fs'
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
 * @param dir A directory path
 */
export function readDirRecursive(dir: string, cb: (err?: Error, files?: string[]) => void) {
  const result: string[] = []
  fs.readdir(dir, (err, files) => {
    if (err) return cb(err)
    if (!files.length) return cb(undefined, result)
    let remain = files.length
    files.forEach((file) => {
      file = path.resolve(dir, file)
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          readDirRecursive(file, (err, files) => {
            if (files) result.push(...files)
            if (--remain === 0) return cb(undefined, result)
          })
        } else {
          result.push(file)
          if (--remain === 0) return cb(undefined, result)
        }})})})}
