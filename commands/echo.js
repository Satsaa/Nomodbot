module.exports.run = (params) => {
  if (params.length !== 0) {
    return params.join(' ')
  }
}

module.exports.help = () => {
  return 'Repeat text. command <text->'
}
