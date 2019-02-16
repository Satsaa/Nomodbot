
/**
 * Enables creating ratelimits for actions  
 * 
 */
module.exports = class RateLimiter {
  /**
   * Construct a new RateLimiter  
   * @param {Object} options
   * @param {number} options.duration Maximum age of an entry
   * @param {number} options.limit Maximum entries per duration
   * @param {number} options.delay Minimum time between entries
   * @param {array} options.times Reference to an array
   */
  constructor (options = {}) {
    this.duration = 60000
    this.limit = 10
    this.delay = 0
    this.times = []

    this.set(options)
  }

  /**
   * Edit variables in object format
   * @param {Object} options 
   * @param {number} options.duration Maximum age of an entry
   * @param {number} options.limit Maximum entries per duration
   * @param {number} options.delay Minimum time between entries
   * @param {array} options.times Reference to an array
   */
  set (options = {}) {
    if (options.duration) this.duration = options.duration
    if (options.limit) this.limit = options.limit
    if (options.delay) this.delay = options.delay
    if (options.times) this.times = options.times
  }

  add (ms = Date.now()) {
    this.times.push(ms)
  }

  /**
   * Calculate how long untill add() can be used without exceeding ratelimits
   * @returns {number} Milliseconds
   */
  next () {
    let now = Date.now()

    // Remove times older than duration
    for (let i = 0; i < this.times.length; i++) {
      if (this.times[i] < now - this.duration) { // time is expired
        this.times.shift()
        i--
      } else break
    }

    // Calculate next time
    if (this.times.length < this.limit) { // Limit is not reached
      // Calculate needed wait for delay
      return this.times.length ? (this.times[this.times.length - 1] + this.delay) - now : 0
    } else {
      let exceeds = this.times.length - this.limit
      let delayTest = (this.times[this.times.length - 1] + this.delay) - now // test only for delay
      let limitTest = (this.times[0 + exceeds] + this.duration) - now // test all but delay
      return delayTest > limitTest ? delayTest : limitTest
    }
  }

  remaining () {
    return this.limit - this.times.length
  }
}
