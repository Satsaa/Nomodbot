import matchKeys, { MatchKeysOptions } from './matchKeys'

export interface ExpectOptions {
  /** Whether to return after first match or not */
  once?: boolean,
  /** Timeout after this ms and callback with `expired` = true */
  timeout?: null | number,
  /** Options on how matching is done */
  matchOptions?: MatchKeysOptions
}

export interface ExpectEntry {
  cb: CallBack,
  id: number,
  once: boolean,
  matchObj: object,
  options: ExpectOptions,
  timeout: null | NodeJS.Timeout,
}

export type CallBack = (expired: boolean, match?: object) => void

/**
 * The `Expector` is used to check if an object sent through  
 * `Expector.receive` matches any entries created through  
 * `Expector.expect` and calls the supplied callback
 */
export default class Expector {

  private entries: ExpectEntry[]
  private id: number

  constructor() {
    this.entries = []
    this.id = 1
  }

  /**
   * Call `cb` when a matching object is received  
   * Place keys that are most likely to be incorrect first
   * @param matchObj Object containing matched keys
   * @param options options
   * [Defaults]({once:true,timeout:null,matchOptions:{ignoreUndefined:true,matchValues:true,maxDepth:undefined}})
   * @param cb Called when timedout or matching object is received
   * @returns Identifier for this entry
   */
  public expect(matchObj: object, cb: CallBack): number
  public expect(matchObj: object, options: ExpectOptions, cb: CallBack): number
  public expect(matchObj: object, options: ExpectOptions | CallBack, cb?: CallBack) {

    if (typeof options === 'function') {
      cb = options
      options = {}
    }
    if (typeof cb !== 'function') throw new Error('Callback is not a function?')

    const id = this.id++
    this.entries.push({
      cb, id,
      once: options.once === undefined ? true : options.once,
      matchObj,
      options: {
        once: true,
        timeout: null,
        matchOptions: {
          ignoreUndefined: true,
          matchValues: true,
          maxDepth: undefined,
          ...(options.matchOptions || {}) },
        ...options},
      timeout: typeof options.timeout !== 'number' ? null : setTimeout(() => {
        if (cb === undefined) throw new Error('Callback is undefined?')
        cb(true)
        this.unExpect(id)
      }, options.timeout),
    })
    return id
  }

  /**
   * Delete an entry
   * @param id
   */
  public unExpect(id: number) {
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i]
      if (entry.id === id) {
        this.entries.splice(i, 1)
      }
    }
  }

  /**
   * Test all entries against `testObj`
   * @param testObj 
   */
  public receive(testObj: object) {
    if (this.entries.length) {
      for (let i = 0; i < this.entries.length; i++) {
        const entry = this.entries[i]

        // Test for match
        if (matchKeys(testObj, entry.matchObj, entry.options.matchOptions)) {
          if (entry.once) {
            this.entries.splice(i, 1)
            if (entry.timeout) clearTimeout(entry.timeout)
            i--
          }
          entry.cb(false, testObj)
        }
      }
    }
  }
}
