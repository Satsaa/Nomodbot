var https = require('https')

const myUtil = require('../../myutil')

let boldenLinks = true

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    let short = nmb.bot[channel].channel
    if (params[1]) { // requested definition
      let terms = params.slice(1).join(' ')
      define(terms, (error, res) => {
        if (error) {
          console.error(error)
          resolve()
        } else {
          if (res.list.length === 0) {
            return resolve(`No Urban definition for ${terms}`)
          }
          const def = res.list[0]
          let word = myUtil.cap(def.word)
          let definition = myUtil.endPunctuate(def.definition).replace(/\[.*?\]/g, tidyBrackets)
          let example = myUtil.endPunctuate(def.example).replace(/\[.*?\]/g, tidyBrackets)
          let good = def.thumbs_up
          let bad = def.thumbs_down
          let link = def.permalink.replace('http://', '').replace(/^[a-zA-Z0-9]*\./, '')
          let dateStr = myUtil.dateString(Date.parse(def.written_on))

          let full = `[${myUtil.fontify(word, 'mathSansBold')}] ${definition} 𝗘𝘅𝗮𝗺𝗽𝗹𝗲: ${example} ⮝${good} ⮟${bad} ${link} ${dateStr}`
          resolve(full.length > short.max_length - short.dupe_affix.length + 1 ? shorten(def, definition, example, short.max_length - short.dupe_affix.length + 1) : full)
        }
      })
    } else { // random definition
      random((error, res) => {
        if (error) {
          console.error(error)
          resolve()
        } else {
          if (res.list.length === 0) {
            return resolve(`No Urban definition returned`)
          }
          const def = res.list[0]
          let word = myUtil.cap(def.word)
          let definition = myUtil.endPunctuate(def.definition).replace(/\[.*?\]/g, tidyBrackets)
          let example = myUtil.endPunctuate(def.example).replace(/\[.*?\]/g, tidyBrackets)
          let good = def.thumbs_up
          let bad = def.thumbs_down
          let link = def.permalink.replace('http://', '').replace(/^[a-zA-Z0-9]*\./, '')
          let dateStr = myUtil.dateString(Date.parse(def.written_on))

          let full = `[${myUtil.fontify(word, 'mathSansBold')}] ${definition} 𝗘𝘅𝗮𝗺𝗽𝗹𝗲: ${example} ⮝${good} ⮟${bad} ${link} ${dateStr}`
          resolve(full.length > short.max_length - short.dupe_affix.length + 1 ? shorten(def, definition, example, short.max_length - short.dupe_affix.length + 1) : full)
        }
      })
    }
  })

  function shorten (def, definition, example, maxLength) {
    let word = myUtil.cap(def.word)
    let good = def.thumbs_up
    let bad = def.thumbs_down
    let link = def.permalink.replace('http://', '').replace(/^[a-zA-Z0-9]*\./, '')
    let dateStr = myUtil.dateString(Date.parse(def.written_on))

    let full = `[${myUtil.fontify(word, 'mathSansBold')}] ${definition} 𝗘𝘅𝗮𝗺𝗽𝗹𝗲: ${example} ⮝${good} ⮟${bad} ${link} ${dateStr}`
    let length = full.length

    if (maxLength >= length - definition.length - example.length - '𝗘𝘅𝗮𝗺𝗽𝗹𝗲: '.length) {
      if (maxLength >= length - example.length) {
        // possible to shorten by only cutting the example
        console.log('Removed example')
        return `[${myUtil.fontify(word, 'mathSansBold')}] ${definition} ⮝${good} ⮟${bad} ${link} ${dateStr}`
      // } else if (maxLength >= length - definition.length) {
      //  // possible to shorten by only cutting the definition
      //  console.log('possible to shorten by only cutting the definition')
      //  return `[${myUtil.fontify(word, 'mathSansBold')}] ${definition.substring(0, definition.length - (length - maxLength))} 𝗘𝘅𝗮𝗺𝗽𝗹𝗲: ${example} ⮝${good} ⮟${bad} ${link} ${dateStr}`
      } else { // cut definition and remove example
        console.log('Cutted definition and removed example')

        return `[${myUtil.fontify(word, 'mathSansBold')}] ${definition.substring(0, definition.length - (length - maxLength - example.length - '𝗘𝘅𝗮𝗺𝗽𝗹𝗲: '.length)).slice(0, -3) + '...'} ⮝${good} ⮟${bad} ${link} ${dateStr}`
      }
    } else {
      console.log('impossible')
      return full.substring(0, maxLength).slice(0, -3) + '...' // impossible to nicely shorten
    }
  }

  function tidyBrackets (match) {
    if (boldenLinks) return myUtil.fontify(match.substring(1, match.length - 1), 'mathSansBold')
    return match.substring(1, match.length)
  }

  function define (terms, cb) {
    var options = {
      host: 'api.urbandictionary.com',
      path: '/v0/define?term=' + encodeURIComponent(terms),
      headers: {
        'Accept': 'application/json'
      }
    }

    https.get(options, (res) => {
      switch (res.statusCode) {
        case 200: // success!
          var data = ''
          res.on('data', (chunk) => {
            data += chunk
          }).on('end', () => {
            cb(null, JSON.parse(data))
          }).on('error', (err) => {
            cb(err)
          })
          break
        default:
          cb(null, `Status code: ${res.statusCode}`)
          break
      }
    })
  }

  function random (cb) {
    var options = {
      host: 'api.urbandictionary.com',
      path: '/v0/random',
      headers: {
        'Accept': 'application/json'
      }
    }

    https.get(options, (res) => {
      switch (res.statusCode) {
        case 200: // success!
          var data = ''
          res.on('data', (chunk) => {
            data += chunk
          }).on('end', () => {
            cb(null, JSON.parse(data))
          }).on('error', (err) => {
            cb(err)
          })
          break
        default:
          cb(null, `Status code: ${res.statusCode}`)
          break
      }
    })
  }
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Get the Urban Dictionary definition of a word: ${params[1]} <words...>. Note: Boldened words are other Urban Dictionary words`)
  })
}
