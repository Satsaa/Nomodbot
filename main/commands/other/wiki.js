var https = require('https')

const myUtil = require('../../myutil')

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (!params[1]) return resolve('You must define subject to search (params 1+)')
    else {
      let subject = params.slice(1).join(' ')
      summarize(subject, (error, res) => {
        if (error) {
          console.error(error)
          resolve()
        } else {
          console.log(res)
          for (var key in res.query.pages) {
            let msg = `[${res.query.pages[key].title}] ${res.query.pages[key].extract} ` // summary portion
            let link = `wikipedia.org/wiki/${res.query.pages[key].title.replace(' ', '_')}` // link only
            if (msg.length + link.length > nmb.bot[channel].channel.max_length - 3) { // too long
              msg = msg.substring(0, nmb.bot[channel].channel.max_length - 3 - link.length - 4) + '...' // cut
            }
            resolve(`${msg} ${link}`)
            break
          }
        }
      })
    }
  })

  function summarize (subject, cb) {
    var options = {
      host: 'en.wikipedia.org',
      path: '/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&exsentences=1&redirects=1&titles=' + encodeURIComponent(subject),
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
    resolve(`Get the Wikipedia summary of a subject: ${params[1]} <subject...>`)
  })
}
