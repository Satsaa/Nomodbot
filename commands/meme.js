const fs = require('fs')
let util = require('../util.js')
let memes = {}

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (!(memes.hasOwnProperty(channel))) {
      fs.access('./data/channel/memes/' + channel + '.json', fs.constants.F_OK, (err) => {
        if (err) { // create channel meme base
          fs.writeFile('./data/channel/memes/' + channel + '.json', '[]', (err) => {
            if (!err) {
              console.log(`* [${channel}] Created meme file`)
              resolve(meme(channel, params))
            } else {
              console.log(`* [${channel}] FAILED TO CREATE MEME FILE: ${err}`)
            }
          })
        } else { // file is present
          resolve(meme(channel, params))
        }
      })
    }
    resolve(meme(channel, params))

    function meme (channel, params) {
      memes[channel] = require('../data/channel/memes/' + channel + '.json')

      if (typeof params[1] !== 'undefined') {
        if (params[1].toLowerCase() === 'list') { // list memes
          return Object.keys(memes[channel]).join(', ')
        } else if (params[1].toLowerCase() === 'add') { // add a meme
          if (!params[2]) return 'You must specify a meme name! (param 2)'
          if (!params[3]) return 'You must specify text for the meme! (param 3+)'
          if (memes[channel].hasOwnProperty(params[2])) return 'Meme with this name already exists :('
          memes[channel][params[2]] = params.slice(3).join(' ')
          save(channel, memes[channel])
          return `Added meme ${params[2]}: ${memes[channel][params[2]]}`
        } else if (params[1].toLowerCase() === 'del') { // delete a meme
          if (!params[2]) return 'You must specify a meme name! (param 2)'
          if (!memes[channel].hasOwnProperty(params[2])) return 'Meme not found'
          delete memes[channel][params[2]]
          save(channel, memes[channel])
          return 'Deleted meme ' + params[2]
        }
      }
      // get a meme
      if (params[1]) {
        params[1] = params[1].toLowerCase()
        if (memes[channel].hasOwnProperty(params[1])) {
          return memes[channel][params[1]]
        }
      }
      let randomKey = util.getRandomKey(memes[channel])
      return randomKey + ': ' + memes[channel][randomKey]
    }

    function save (channel, memes) {
      fs.writeFile('./data/channel/memes/' + channel + '.json', JSON.stringify(memes, null, 2), (err) => {
        if (!err) {
          console.log(`* [${channel}] Modified to meme file`)
        } else {
          console.log(`* [${channel}] FAILED TO MODIFY MEME FILE: ${err}`)
        }
      })
    }
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Returns a channel meme: command [<name>]. Returns list of memes: command list. Adds a meme: command add <name> <meme...>. Deletes a meme: command del <name>')
  })
}
