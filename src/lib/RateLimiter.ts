

export interface RateLimiterOptions {
  /** Max age of an entry */
  duration?: number,
  /** Max entries within `options.duration` */
  limit?: number,
  /** Max queued entries */
  queueSize?: number | null,
  /** Min time between entries */
  delay?: number
}

/**
 * Enables creating ratelimiting for actions  
 * 
 */
export default {
  Queue: class RateLimiter {

    duration: number;
    limit: number;
    queueSize: number | null;
    delay: number;
    _times: number[];
    _callbacks: {cb:(...args:any[]) => void, args: any[] }[];

    /**
     * Enables queueing actions within limits
     * @param options
     */
    constructor (options?: RateLimiterOptions) {
      if (!options) options = {}
      this.duration = options.duration || 60000
      this.limit = options.limit || 30
      this.queueSize = options.queueSize || null
      this.delay = options.delay || 1200

      this._times = []
      this._callbacks = []
    }

    /**
     * Queue calling of `cb` with optional `args`  
     * This entry will be placed last on the queue
     * @param cb Callback function
     * @param args Function arguments for `cb`
     */
    queue (cb: (...args:any[]) => void, ...args: any[]) {
      if (this.queueSize !== null && this._callbacks.length + 1 > this.queueSize) {
        return
      }
      if (this._callbacks.push({ cb: cb, args: args }) === 1) {
        this.refreshLoop()
      }
    }

    /**
     * Queue calling of `cb` with optional `args`  
     * This entry will be placed FIRST on the queue
     * @param cb Callback function
     * @param args Function arguments for `cb`
     */
    queueFirst (cb: (...args:any[]) => void, ...args: any[]) {
      if (this.queueSize !== null && this._callbacks.length + 1 > this.queueSize) {
        this._callbacks.pop()
      }
      if (this._callbacks.unshift({ cb: cb, args: args }) === 1) {
        this.refreshLoop()
      }
    }

    private loop () {
      this._times.push(Date.now())
      this._callbacks[0].cb(...this._callbacks[0].args)
      this._callbacks.shift()
      if (this._callbacks.length > 0) {
        setTimeout(() => {
          this.loop()
        }, this.getTimeout())
      }
    }

    // Call when new entry added
    private refreshLoop () {
      if (this._callbacks.length === 1) {
        setTimeout(() => {
          this.loop()
        }, this.getTimeout())
      }
    }

    private getTimeout () {
      const now = Date.now()

      // Remove old entries
      for (let i = 0; i < this._times.length; i++) {
        if (this._times[i] < now - this.duration) {
          this._times.shift()
          i--
        } else break
      }

      // if there is more or equal items in array than limit
      if (this._times.length >= this.limit) {
        return (this._times[0] + this.duration) - now
      }

      let lastMsgTime = this._times[this._times.length - 1]
      if (isNaN(lastMsgTime)) lastMsgTime = 0
      return (now - lastMsgTime > this.delay) ? 0 : (this.delay - (now - lastMsgTime))
    }
  },

  Passive: class RateLimiter {

    duration: any;
    limit: any;
    delay: any;
    _times: number[];

  /**
   * Helps manual ratelimiting
   * 
   * `RateLimiter.add()` adds current time to an array  
   * `RateLimiter.next()` returns the remaining time until `add()` can be used without exceeding limits
   * @deprecated
   */
    constructor (options?: RateLimiterOptions) {
      if (!options) options = {}
      this.duration = options.duration || 6000
      this.limit = options.limit || 10
      this.delay = options.delay || 0

      this._times = []
    }

    add (ms = Date.now()):void {
      this._times.push(ms)
    }

    /**
     * Calculate how long until add() can be used without exceeding ratelimits
     * @returns Milliseconds
     */
    next ():number {
      const now = Date.now()

      // Remove times older than duration
      for (let i = 0; i < this._times.length; i++) {
        if (this._times[i] < now - this.duration) { // time is expired
          this._times.shift()
          i--
        } else break
      }

      // Calculate next time
      if (this._times.length < this.limit) { // Limit is not reached
      // Calculate needed wait for delay
        return this._times.length ? (this._times[this._times.length - 1] + this.delay) - now : 0
      } else {
        const exceeds = this._times.length - this.limit
        const delayTest = (this._times[this._times.length - 1] + this.delay) - now // test only for delay
        const limitTest = (this._times[0 + exceeds] + this.duration) - now // test all but delay
        return delayTest > limitTest ? delayTest : limitTest
      }
    }

    /**
     * Calculate how many times add() can be used without exceeding ratelimits  
     * Calls next() so a bit of overhead
     * @returns Entries until full
     */
    remaining ():number {
      this.next() // Must be called to refresh times
      return this.limit - this._times.length
    }
  }
}
