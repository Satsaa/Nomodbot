import deepClone from './deepClone'

export interface RateLimiterOptions {
  /** Max age of an entry */
  duration?: number,
  /** Max entries within `options.duration` */
  limit?: number,
  /** Min time between entries */
  delay?: number
  /** Maximum queued entries at a time */
  queueSize?: null | number
}

/**
 * Enables creating queuing for actions and keeping rates within limits  
 */
export default class RateLimiter {

  public queueSize: null | number
  public times: number[][]
  public callbacks: Array<{cb: (...args: any[]) => void, args: any[] }>
  private opts: Array<Required<RateLimiterOptions>>

    /**
     * Enables queueing actions within limits
     * @param options Array or single instance of options.  
     * The delay is calculated for each and the highest delay is selected.  
     * Lowest defined queueSize is selected.
     * @param queueSize Maximum queued entries at once
     */
  constructor(options: DeepReadonly<RateLimiterOptions | RateLimiterOptions[]>) {
    options = deepClone(options)
    const opts = (Array.isArray(options)) ? options : [options]
    this.opts = []
    this.times = []
    opts.forEach((element) => {
      this.times.push([])
      this.opts.push({
        duration: 60000,
        limit: 1,
        delay: 0,
        queueSize: null,
        ...element,
      })
    })
    this.queueSize = Math.max(...this.opts.filter(value => value.queueSize !== null).map(value => value.queueSize!))
    if (this.queueSize === -Infinity) this.queueSize = null // Math.max() with no args returns -infinity
    this.callbacks = []
  }

    /**
     * Queue calling of `cb` with optional `args`  
     * This entry will be placed last on the queue
     * @param cb Callback function
     * @param args Function arguments for `cb`
     */
  public queue(cb: (...args: any[]) => void, ...args: any[]) {
    if (this.queueSize !== null && this.callbacks.length + 1 > this.queueSize) {
      return
    }
    if (this.callbacks.push({ cb, args }) === 1) {
      this.refreshLoop()
    }
  }

    /**
     * Queue calling of `cb` with optional `args`  
     * This entry will be placed FIRST on the queue
     * @param cb Callback function
     * @param args Function arguments for `cb`
     */
  public queueFirst(cb: (...args: any[]) => void, ...args: any[]) {
    if (this.queueSize !== null && this.callbacks.length + 1 > this.queueSize) {
      this.callbacks.pop()
    }
    if (this.callbacks.unshift({ cb, args }) === 1) {
      this.refreshLoop()
    }
  }

  private loop() {
    const now = Date.now()
    this.times.forEach((times) => {times.push(now)})
    this.callbacks[0].cb(...this.callbacks[0].args)
    this.callbacks.shift()
    if (this.callbacks.length > 0) {
      setTimeout(() => {
        this.loop()
      }, this.getTimeout())
    }
  }

  // Call when new entry added
  private refreshLoop() {
    if (this.callbacks.length === 1) {
      setTimeout(() => {
        this.loop()
      }, this.getTimeout())
    }
  }

  private getTimeout() {
    return Math.max(...this.opts.map((options, i) => {
      return this._getTimeout(options, i)
    }))
  }

  private _getTimeout(options: Required<RateLimiterOptions>, timesIndex: number) {
    const now = Date.now()
    const times = this.times[timesIndex]

    // Remove old entries
    for (let i = 0; i < times.length; i++) {
      if (times[i] < now - options.duration) {
        times.shift()
        i--
      } else break
    }

    let lastMsgTime = times[times.length - 1]
    if (isNaN(lastMsgTime)) lastMsgTime = 0

    // if there is more or equal items in array than limit (lastMsgTime - times[options.limit - 1])
    if (times.length === options.limit) {
      if (now - lastMsgTime > options.delay) return (times[0] + options.duration) - now
      else return Math.max((times[0] + options.duration) - now, options.delay - (now - lastMsgTime)) + 1
    } else if (times.length > options.limit) {
      if (now - lastMsgTime > options.delay) return (times[0] + options.duration) - now + (lastMsgTime - times[options.limit - 1])
      else return Math.max((times[0] + options.duration) - now, options.delay - (now - lastMsgTime)) + (lastMsgTime - times[options.limit - 1])
    }
    return (now - lastMsgTime > options.delay) ? 0 : (options.delay - (now - lastMsgTime))
  }
}
