const fs = require('fs')
const util = require('util')
var https = require('https')

let dict = require('../../../data/global/oxDictionary.json')
const myUtil = require('../../myutil')
const app = require('../../../keyConfig/OxfordDictionaries.json')

let lang = 'en' // later not hardcoded Kapp

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (!params[1]) return resolve('You must define a word to define (param 1)')

    let words = params.slice(1).join(' ')
    if (params[1].toLowerCase() === 'shushama') return resolve('[Noun /shüseimm/ Shushama]: A person who steals another person\'s property, especially by stealth, using force or threat of violence. Not ninja. So weeb.⁭ ')
    if (words in dict) { // Find if in cache
      console.log(`* [${channel}] Using cached definition of "${words}"`)
      return resolve(`[${dict[words].cat} ${dict[words].pronun}${dict[words].word}]: ${dict[words].definition}${dict[words].definition.endsWith('.') ? '' : '.'}`)
    } else {
      define(words, lang, (error, data) => {
        if (error) return console.error(error)
        else {
          // console.log(util.inspect(data, { showHidden: false, depth: null }))
          if (typeof data.results === 'undefined' || typeof data === 'undefined') {
            return resolve(data)
          }
          if ((((((((data.results[0].lexicalEntries || {})[0] || {}).entries || {})[0] || {}).senses || {})[0] || {}).definitions || {})[0]) var definition = data.results[0].lexicalEntries[0].entries[0].senses[0].definitions[0]
          else definition = 'No definition.'
          let word = data.results[0].word
          if (definition.charAt(0) === '(') { // Capitalize char after paren
            definition = myUtil.cap(definition, 1)
          } else { // Capitalize first char
            definition = myUtil.cap(definition)
          }
          let pronun // pronunciation
          let cat // noun, verb etc
          if (((((data.results[0].lexicalEntries || {})[0] || {}).pronunciations || {})[0] || {}).phoneticSpelling) {
            pronun = '/' + data.results[0].lexicalEntries[0].pronunciations[0].phoneticSpelling + '/ '
          } else pronun = ''

          if (((data.results[0].lexicalEntries || {})[0] || {}).lexicalCategory) {
            cat = data.results[0].lexicalEntries[0].lexicalCategory // noun, verb etc
          } else cat = 'Unknown?'
          // save to cache
          dict[words] = { 'cat': cat, 'pronun': pronun, 'word': word, 'definition': definition }
          console.log(`* [GLOBAL] Cached definition of "${words}"`)
          save(dict)

          resolve(`[${cat} ${pronun}${word}]: ${definition}${definition.endsWith('.') ? '' : '.'}`)
        }
      })
    }

    function define (words, lang, cb) {
      var options = {
        host: 'od-api.oxforddictionaries.com',
        port: 443,
        path: '/api/v1/entries/' + lang + '/' + encodeURIComponent(words),
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'app_id': app.app_id,
          'app_key': app.app_key
        }
      }

      https.get(options, (res) => {
        switch (res.statusCode) {
          case 200: // success!
            var data = ''
            res.on('data', (chunk) => {
              data += chunk
            }).on('end', () => {
              let result = JSON.parse(data)
              cb(null, result)
            }).on('error', (err) => {
              cb(err)
            })
            break
          case 403: // Invalid credentials
            cb(null, `Invalid credentials D: `)
            break
          case 404: // Not found
            cb(null, `No such entry as "${words}" :(`)
            break
          case 414: // Request URI Too Long
            cb(null, `Your request is too long :|`)
            break
          case 500: // Internal Server Error
            cb(null, `Internal Server Error :(`)
            break
          case 502: // Bad Gateway
            cb(null, `Oxford Dictionaries API is down or being upgraded :|`)
            break
          case 503: // Service Unavailable
            cb(null, `Server under high load. Try again later :)`)
            break
          case 504: // Gateway timeout
            cb(null, `Request timed out :(`)
            break
          default:
            cb(null, `Something odd happened o_O`)
            break
        }
      })
    }

    function save (dict) {
      fs.writeFile('./data/global/oxDictionary.json', JSON.stringify(dict, null, 2), (err) => {
        if (!err) {
          console.log(`* [GLOBAL] Modified dictionary file`)
        } else {
          console.error(`* [GLOBAL] FAILED TO MODIFY DICTIONARY FILE: ${err}`)
        }
      })
    }
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Get definition of a word or sentence from Oxford Dictionaries: ${params[1]} <words...>`)
  })
}
