var RateHandler = require('./src/lib/RateHandler')

var rateHandler = new RateHandler({ duration: 5000, delay: 250 })

setTimeout(() => {}, 9999999) // Stop exit
