
module.exports.getRandomInt = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min // The maximum is exclusive and the minimum is inclusive
}

module.exports.getRandomProperty = (obj) => {
  var keys = Object.keys(obj)
  return obj[keys[keys.length * Math.random() << 0]]
}

module.exports.getRandomKey = (obj) => {
  var keys = Object.keys(obj)
  return keys[keys.length * Math.random() << 0]
}
module.exports.RandomNormal = (min = 0, max = 100, skew = 1) => {
  return Math.pow(((Math.sqrt(-2.0 * Math.log(Math.random())) * Math.cos(2.0 * Math.PI * Math.random())) / 10.0 + 0.5), skew) * (max - min) + min
}

// convert milliseconds to days hours and minutes
module.exports.MSToDHM = (ms) => {
  var cd = 24 * 60 * 60 * 1000
  var ch = 60 * 60 * 1000
  var d = Math.floor(ms / cd)
  var h = Math.floor((ms - d * cd) / ch)
  var m = Math.round((ms - d * cd - h * ch) / 60000)
  var pad = (n) => { return n < 10 ? '0' + n : n }
  if (m === 60) {
    h++
    m = 0
  }
  if (h === 24) {
    d++
    h = 0
  }
  return [d, pad(h), pad(m)]
}
