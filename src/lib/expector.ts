
import matchKeys, { MatchKeysOptions } from './matchKeys'

export interface ExpectOptions {
  /** Timeout after this ms and callback with `expired` = true. Timeouts are checked on message received */
  timeout?: null | number,
  /** Whether or not to return after first match */
  once?: boolean,
  /** Options on how matching is done */
  matchOptions?: MatchKeysOptions
}

/**
 * The `Expector` is used to check if an object sent through
 * `Expector.receive` matches any entries created through
 * `Expector.expect` and calls the supplied callback
 */
export default class Expector {

  private id: number
  private entries: any[]

  constructor() {
    this.id = 1
    this.entries = []
  }

  /**
   * Test all entries against `testObj`
   * @param tesObj 
   */
  public receive(tesObj: {[x: string]: any}) {
    if (this.entries.length) {
      for (let i = 0; i < this.entries.length; i++) {
        const entry = this.entries[i]

        // Test for match
        if (matchKeys(entry.match, tesObj, entry.matchOptions)) {
          console.log('MATCHED')
          entry.cb(false, tesObj)
          if (entry.once) {
            if (entry.timeout) clearTimeout(entry.timeout)
            this.entries.splice(i)
            i--
          }
        }
      }
    }
  }

  /**
   * Call `cb` when a matching object is received
   * Place keys that are most likely to be incorrect first
   * 
   * @param match Object containing matched keys
   * 
   * @param options `options` or `cb`
   * @param cb Called when timedout or matchingmessage is received
   * 
   * @returns Identifier for this entry
   */
  public expect(match: {[x: string]: any}, options: ExpectOptions, cb: (expired: boolean, message?: string) => void): number {
    if (typeof options === 'function') {
      cb = options
      options = {}
    }
    const id = this.id++
    this.entries.push({
      cb,
      id,
      match,
      matchOptions: options.matchOptions || {once: true, matchValues: true, timeout: null},
      once: options.once === undefined ? true : options.once,
      timeout: !options.timeout ? null : setTimeout(() => {
        cb(true)
        this.unExpect(id)
      }, options.timeout),
    })
    return id
  }

  /**
   * Delete entries
   * @param ids
   */
  public unExpect(ids: number | number[]) {
    if (typeof ids === 'number') ids = [ids]
    ids.forEach((id) => {
      const index = this.entries.indexOf(id)
      if (index !== -1) this.entries.splice(index)
    })
  }
}
