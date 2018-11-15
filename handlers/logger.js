const fs = require('fs')

let streams = {}
let byteSizes = {}
const types = {
  'chat': 'c',
  'action': 'a',
  'sub': 's',
  'gift': 'g',
  'massgift': 'm',
  'timeout': 't',
  'ban': 'b'
}

module.exports.log = (channel, type, name, userId, message) => {
  if (!(type in types)) {
    console.log(`* [${channel}] Invalid log type: ${type}`)
  } else {
    if (!(channel in streams && streams[channel])) {
      console.log(`* [${channel}] Log msg dropped due to uninitialized write stream`)
    } else {
      type = types[type]
      message = message.replace('\n', '')
      let nameLow = name.toLowerCase()

      let short = nmb.bot[channel].log
      let line = `${logDate()}:${type}:${name}:${message}\n`
      if (short['$messages'] === 0) {
        short['$start_time'] = logDate()
      }
      short['$messages']++
      short['$end_time'] = logDate()
      if (typeof short[nameLow] === 'undefined') {
        short[nameLow] = [
          userId,
          [nmb.bot[channel].log['$log_offset']], // offsets
          [logDate()] // times (ms / 1000) Second precision
        ]
      } else {
        short[nameLow][1].push(nmb.bot[channel].log['$log_offset'])
        short[nameLow][2].push(logDate())
      }
      console.log(Buffer.byteLength(line, 'utf8'), ' ||| ' + line)
      nmb.bot[channel].log['$log_offset'] += Buffer.byteLength(line, 'utf8')
      streams[channel].write(line)
    }
  }
}

function logDate () { // get time in ms at 1 seconds precision
  return Math.round(Date.now() / 1000)
}

module.exports.startStream = (channel) => {
  fs.stat('./data/' + channel + '/log.txt', (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') stats = { 'size': 0 }
      else throw err
    }
    if (stats.size !== nmb.bot[channel].log['$log_offset']) {
      console.log(`Stats: ${stats.size} !== ${nmb.bot[channel].log['$log_offset']} :Saved`)
      nmb.bot[channel].log['$log_offset'] = stats.size // BANDAID REMOVE LATER
      console.log(`Stats: ${stats.size} !== ${nmb.bot[channel].log['$log_offset']} :Saved`)
    }
    streams[channel] = fs.createWriteStream('./data/' + channel + '/log.txt', { flags: 'a' })
  })
}
module.exports.endStream = (channel) => {
  if (!(channel in streams)) {
    console.log(`* [${channel}] Ignored endStream() as channel's write stream doesn't exist`)
    return
  }
  streams[channel].end()
  delete streams[channel]
  fs.writeFile(`./data/${channel}/log.json`, JSON.stringify(nmb.bot[channel].log, null, '\t'), 'utf8', (err) => {
    if (err) throw err
    delete nmb.bot[channel].log
    console.log(`* [${channel}] Saved log.json and ended stream`)
  })
}

// mostly used on exit
module.exports.endStreamSync = (channel) => {
  if (!(channel in streams)) {
    console.log(`* [${channel}] Ignored endStreamSync() as channel's write stream doesn't exist`)
    return
  }
  streams[channel].end()
  delete streams[channel]
  fs.writeFileSync(`./data/${channel}/log.json`, JSON.stringify(nmb.bot[channel].log, null, '\t'), 'utf8')
  delete nmb.bot[channel].log
  console.log(`* [${channel}] Saved log.json and ended stream`)
}

/*
// log_offset tracks the current offset. If the process is terminated, offset is not saved nor log.json
// We can add the untracked lines in log.txt at next launch based on the unsaved offset
// (ms / 1000) Second precision
...
ms:type:User:msg...
ms:type:User:msg...
ms:type:User:msg...
ms:type:User:msg...

*/

/* log.json
{
  '$messages': num,
  '$users': num,
  '$start_time': ms,
  '$end_time': ms,
  'user0': {
    'user-id': 1010230
    [ // byte offsets

    ],[ // time (ms / 1000) Second precision

    ]
  },
  ...
}
*/
