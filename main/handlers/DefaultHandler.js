const fs = require('fs')
const path = require('path')

function walkSync (dir, filelist) {
  var files = fs.readdirSync(dir)
  filelist = filelist || []
  files.forEach(function (file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist)
    } else {
      filelist.push(path.join(dir, file))
    }
  })
  return filelist
}

let defaults = {}

walkSync('./data/default/').forEach(path => {
  path = path.replace(/\\/gi, '/')
  let name = path.split('/').pop().replace('.json', '')
  defaults[name] = require('../../' + path)
})

/**
 * Make sure all necessary parameters are present in config files and sets a default value if needed
 * Values are just copied from the default folder and merged to the channel specific objects
 */
module.exports = (channel, reload = null) => {
  if (reload) {
    defaults[reload] = JSON.parse(fs.readFileSync('./data/default/' + reload + '.json'))
    if (typeof defaults[reload] === 'object') {
      for (let setting in defaults[reload]) {
        if (typeof nmb.bot[channel][reload][setting] === 'undefined') {
          nmb.bot[channel][reload][setting] = defaults[reload][setting]
        }
      }
    }
    return
  }
  for (let config in defaults) {
    if (typeof defaults[config] === 'object') {
      for (let setting in defaults[config]) {
        if (typeof nmb.bot[channel][config][setting] === 'undefined') {
          nmb.bot[channel][config][setting] = defaults[config][setting]
        }
      }
    }
  }
}

/*
{
  'channel': require('../data/default/channel.json'),
  'commands': require('../data/default/config.json'),
  'log': require('../data/default/config.json'),
  'myiq': require('../data/default/config.json'),
  'roomstate': require('../data/default/config.json')
} */
