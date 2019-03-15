
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
 * Enables creating queuing for actions and keeping rates within limits  
 */
export default class RateLimiter {

  public _times: number[]
  public _callbacks: Array<{cb: (...args: any[]) => void, args: any[] }>
  private opts: Required<RateLimiterOptions>

    /**
     * Enables queueing actions within limits
     * @param options
     */
  constructor(options: RateLimiterOptions = {}) {
    this.opts = {
      duration: 60000,
      limit: 30,
      queueSize: null,
      delay: 1200,
      ...options,
    }

    this._times = []
    this._callbacks = []
  }

    /**
     * Queue calling of `cb` with optional `args`  
     * This entry will be placed last on the queue
     * @param cb Callback function
     * @param args Function arguments for `cb`
     */
  public queue(cb: (...args: any[]) => void, ...args: any[]) {
    if (this.opts.queueSize !== null && this._callbacks.length + 1 > this.opts.queueSize) {
      return
    }
    if (this._callbacks.push({ cb, args }) === 1) {
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
    if (this.opts.queueSize !== null && this._callbacks.length + 1 > this.opts.queueSize) {
      this._callbacks.pop()
    }
    if (this._callbacks.unshift({ cb, args }) === 1) {
      this.refreshLoop()
    }
  }

  private loop() {
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
  private refreshLoop() {
    if (this._callbacks.length === 1) {
      setTimeout(() => {
        this.loop()
      }, this.getTimeout())
    }
  }

  private getTimeout() {
    const now = Date.now()

      // Remove old entries
    for (let i = 0; i < this._times.length; i++) {
      if (this._times[i] < now - this.opts.duration) {
        this._times.shift()
        i--
      } else break
    }

      // if there is more or equal items in array than limit
    if (this._times.length >= this.opts.limit) {
      return (this._times[0] + this.opts.duration) - now
    }

    let lastMsgTime = this._times[this._times.length - 1]
    if (isNaN(lastMsgTime)) lastMsgTime = 0
    return (now - lastMsgTime > this.opts.delay) ? 0 : (this.opts.delay - (now - lastMsgTime))
  }
}
