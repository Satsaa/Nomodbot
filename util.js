
module.exports.getRandomInt = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min // The maximum is exclusive and the minimum is inclusive
}

module.exports.getRandomProperty = (obj) => {
  var keys = Object.keys(obj)
  return obj[keys[keys.length * Math.random() << 0]]
}

module.exports.RandomNormal = (min = 0, max = 100, skew = 1) => {
  return Math.pow(((Math.sqrt(-2.0 * Math.log(Math.random())) * Math.cos(2.0 * Math.PI * Math.random())) / 10.0 + 0.5), skew) * (max - min) + min
}
