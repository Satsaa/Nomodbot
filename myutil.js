
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

// convert milliseconds to [days, hours, mins, secs]
module.exports.MSToDHMS = (ms) => {
  var d, h, m, s
  s = Math.floor(ms / 1000)
  m = Math.floor(s / 60)
  s = s % 60
  h = Math.floor(m / 60)
  m = m % 60
  d = Math.floor(h / 24)
  h = h % 24
  return [d, h, m, s]
}

module.exports.plural = (v, singular, plural) => {
  return (v === 1 || v === '1' ? singular : plural)
}

module.exports.cap = (string, pos = 0) => {
  return string.slice(0, pos) + string.charAt(pos).toUpperCase() + string.slice(pos + 1)
}