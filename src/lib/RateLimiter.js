
/**
 * Enables creating ratelimits for actions  
 * 
 */
module.exports = {
  Queue: class RateLimiter {
    /**
     * Construct a new RateLimiter  
     * This variant has no timers nor queuing
     * 
     * @param {Object} options
     * @param {number} options.duration Max age of an entry
     * @param {number} options.limit Max entries within duration
     * @param {number} options.queueSize Max queued entries
     * @param {number} options.delay Min time between entries
     */
    constructor (options = {}) {
      this.duration = options.duration || 10000 || 60000
      this.limit = options.limit || 5 || 30
      this.queueSize = options.queueSize || null || null
      this.delay = options.delay || 1000 || 1200

      this._times = []
      this._callbacks = []
      this._timer = null
      this._active = false
    }

    /**
     * Queue execution of a function with optional arguments
     * This entry will be placed last on the queue
     * @param {Function} cb Callback function
     * @param {...any=} args Arguments for the callback function
     */
    queue (cb, ...args) {
      if (this.queueSize !== null && this._callbacks.length + 1 > this.queueSize) {
        console.log('Max queued entries reached!')
        return
      }
      if (this._callbacks.push({ cb: cb, args: args }) === 1) {
        this._refreshLoop()
      }
    }

    /**
     * Queue execution of a function with optional arguments  
     * This entry will be placed FIRST on the queue
     * @param {Function} cb Callback function
     * @param {...any=} args Arguments for the callback function
     */
    queueFirst (cb, ...args) {
      if (this.queueSize !== null && this._callbacks.length + 1 > this.queueSize) {
        this._callbacks.pop()
        console.log('Max queued entries reached!')
      }
      if (this._callbacks.unshift({ cb: cb, args: args }) === 1) {
        this._refreshLoop()
      }
    }

    _loop () {
      this._times.push(Date.now())
      this._callbacks[0].cb(...this._callbacks[0].args)
      this._callbacks.shift()
      if (this._callbacks.length > 0) {
        setTimeout(() => {
          this._loop()
        }, this._getTimeout())
      }
    }

    // Call when new entry added
    _refreshLoop () {
      if (this._callbacks.length === 1) {
        setTimeout(() => {
          this._loop()
        }, this._getTimeout())
      }
    }

    _getTimeout () {
      let now = Date.now()

      // Remove old entries
      for (let i = 0; i < this._times.length; i++) {
        if (this._times[i] < now - this.duration) {
          this._times.shift()
          i--
        } else break
      }

      // if there is more or equal items in array than limit
      if (this._times.length >= this.limit) {
        // (oldest_message_time + limit_period) - current time // ms until limit is not full anymore
        console.log((this._times[0] + this.duration) - now)
        return (this._times[0] + this.duration) - now
      }

      let lastMsgTime = this._times[this._times.length - 1]
      if (isNaN(lastMsgTime)) lastMsgTime = 0
      // current_time - last_msg_time > message_delay ? 0 : message_delay - (current_time - last_msg_time)
      console.log((now - lastMsgTime > this.delay) ? 0 : (this.delay - (now - lastMsgTime)))
      return (now - lastMsgTime > this.delay) ? 0 : (this.delay - (now - lastMsgTime))
    }
  },

  Passive: class RateLimiter {
  /**
   * Construct a new RateLimiter  
   * This variant has no timers nor queuing  
   *  
   * add() adds current time to an array  
   * next() returns the remaining time until add() can be used without exceeding limits
   * 
   * @param {Object} options
   * @param {number} options.duration Max age of an entry
   * @param {number} options.limit Max entries within duration
   * @param {number} options.delay Min time between entries
   */
    constructor (options = {}) {
      this.duration = options.duration || 6000
      this.limit = options.limit || 10
      this.delay = options.delay || 0

      this._times = []
    }

    add (ms = Date.now()) {
      this._times.push(ms)
    }

    /**
   * Calculate how long untill add() can be used without exceeding ratelimits
   * @returns {number} Milliseconds
   */
    next () {
      let now = Date.now()

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
        let exceeds = this._times.length - this.limit
        let delayTest = (this._times[this._times.length - 1] + this.delay) - now // test only for delay
        let limitTest = (this._times[0 + exceeds] + this.duration) - now // test all but delay
        return delayTest > limitTest ? delayTest : limitTest
      }
    }

    /**
   * Calculate how many times add() can be used without exceeding ratelimits  
   * Calls next() so a bit of overhead
   * @returns {number} Entries until full
   */
    remaining () {
      this.next() // Must be called to refresh times
      return this.limit - this._times.length
    }
  }
}
