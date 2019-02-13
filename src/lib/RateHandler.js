
/**
 * Enables creating ratelimits for actions  
 * 
 */
module.exports = class RateHandler {
  /**
   * Constructor a new RateHandler  
   * @param {Object} options
   * @param {number} options.duration Maximum age of an entry
   * @param {number} options.limit Maximum entries per duration
   * @param {number} options.delay Minimum time between entries
   * @param options.times Reference to an array or property. Using a non referencing value has unknown implications
   */
  constructor (options = {}) {
    this.duration = 60000
    this.limit = 10
    this.delay = 0
    this._times = []

    this.set(options)
  }

  /**
   * Edit a bunch of options
   * @param {Object} options 
   * @param {number} options.duration Maximum age of an entry
   * @param {number} options.limit Maximum entries per duration
   * @param {number} options.delay Minimum time between entries
   * @param options.times Reference to an array or property. Using a non referencing value has unknown implications
   */
  set (options = {}) {
    if (options.duration) this.duration = options.duration
    if (options.limit) this.limit = options.limit
    if (options.delay) this.delay = options.delay
    if (options.times) this.times = options.times
  }

  set times (v) {
    // move existing array contents to the new array

    // !!!ASSIGNMENT TO _times WORKS BUT NOT WITH THIS SETTER

    v = this._times.slice()
    this._times = v
  }
  get times () {
    return this._times
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
      return this._times.length ? (this._times[this._times.length - 1] + this.delay) - now : -1
    } else {
      let exceeds = this._times.length - this.limit
      let delayTest = (this._times[this._times.length - 1] + this.delay) - now // test only for delay
      let limitTest = (this._times[0 + exceeds] + this.duration) - now // test all but delay
      return delayTest > limitTest ? delayTest : limitTest
    }
  }
}
