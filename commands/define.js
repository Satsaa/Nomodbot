const util = require('util')
const myUtil = require('../myutil')
var https = require('https')
const app = require('../config/OxfordDictionaries.json')

let lang = 'en' // later not hardcoded Kapp

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (!params[1]) {
      resolve('You must define a word to define (param 1)')
    } else {
      define(params.slice(1).join(' '), lang, (error, data) => {
        if (error) return console.log(error)
        else {
          if (typeof data.results === 'undefined') {
            resolve(data)
          } else {
            console.log(util.inspect(data, { showHidden: false, depth: null }))
            let definition = data.results[0].lexicalEntries[0].entries[0].senses[0].definitions[0]
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
            } else cat = 'Lexical category missing?'

            resolve(`[${cat} ${pronun}${word}]: ${definition}${definition.endsWith('.') ? '' : '.'}`)
          }
        }
      })
    }

    function define (word, lang, cb) {
      var options = {
        host: 'od-api.oxforddictionaries.com',
        port: 443,
        path: '/api/v1/entries/' + lang + '/' + encodeURIComponent(word),
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
            cb(null, `No such entry as "${word}" :(`)
            break
          case 414: // Request URI Too Long
            cb(null, `Your request is too long? :|`)
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
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Get definition of a word or sentence from Oxford Dictionaries: ${params[1]} <words...>`)
  })
}
