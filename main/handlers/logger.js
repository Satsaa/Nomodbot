const fs = require('fs')

let streams = {}
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
      message = message.replace(/\n/gi, '') // remove new lines
      message = message.replace(/ +(?= )/g, '') // replace multiple spaces with a single space

      let short = nmb.bot[channel].log
      let line = `${logDate()}:${type}:${name}:${message}\n`
      track(short, name, userId, logDate())

      short['$log_offset'] += Buffer.byteLength(line, 'utf8')
      streams[channel].write(line)
    }
  }
}

module.exports.readAtOffset = (channel, offset) => {
  return new Promise((resolve, reject) => {
    fs.open(`./data/${channel}/log.txt`, 'r', (err, fd) => {
      if (err) return reject(err)
      fs.read(fd, Buffer.alloc(1024), 0, 1024, offset, (err, bytesRead, buffer) => {
        if (err) return reject(err)
        fs.close(fd, () => {})
        let raw = buffer.toString('utf8')
        let parse = parseLog(raw)
        if (parse === false) reject(new Error(`Invalid log line at offset: ${offset}`))
        else resolve(parseLog(raw))
      })
    })
  })
}

// These do the addition and possible math for you
function getOffset (channel, user, index) { // channel may be an object reference or channel name
  let short
  if (typeof channel === 'object') short = channel[user][1]
  else short = nmb.bot[channel].log[user][1]
  let offset = 0
  for (let i = 0; i < index; i++) {
    const element = short[i]
    offset += element
  }
  return offset
}
function getTime (channel, user, index) { // channel may be an object reference or channel name
  let short
  if (typeof channel === 'object') short = channel[user][2]
  else short = nmb.bot[channel].log[user][2]
  let time = 0
  for (let i = 0; i < index; i++) {
    const element = short[i]
    time += element
  }
  return time // second form
}
module.exports.getOffset = getOffset
module.exports.getTime = getTime

// Add to json
function track (short, name, userId, dateSec) {
  name = name.toLowerCase()
  if (short['$messages'] === 0) {
    short['$start_time'] = dateSec
  }
  short['$messages']++
  short['$end_time'] = dateSec

  if (typeof short[name] === 'undefined') { // first messaged from user
    short['$users']++
    short[name] = [ // initialize users object
      userId,
      [short['$log_offset']], // offsets
      [dateSec] // times (ms / 1000) Second precision
    ]
  } else { // continue users object
    if (!short[name][0]) short[name][0] = userId
    let offset = getOffset(short, name, short[name][1].length)
    let time = getTime(short, name, short[name][2].length)

    short[name][1].push(short['$log_offset'] - offset)
    short[name][2].push(dateSec - time)

    if (short[name][1][short[name][1].length - 1] < 0) {
      if (short[name][2][short[name][2].length - 1] < 0) return 3 // both negative
      else return 1 // offset negative
    } else if (short[name][2][short[name][2].length - 1] < 0) return 2 // time negative
  }
}

// Track untracked logs
function trackLog (channel, offset) {
  return new Promise((resolve, reject) => {
    console.log(`* [${channel}] Tracking for log lines at offset ${offset}`)
    fs.stat(`./data/${channel}/log.txt`, (err, stats) => {
      if (err) return reject(err)
      if (stats.size === offset) {
        console.log(`* [${channel}] No tracking was necessary`)
        return resolve()
      }
      fs.open(`./data/${channel}/log.txt`, 'r', (err, fd) => {
        if (err) return reject(err)
        fs.read(fd, Buffer.alloc(stats.size - offset), 0, stats.size - offset, offset, (err, bytesRead, buffer) => {
          if (err) return reject(err)
          fs.close(fd, () => {})
          let startTime = Date.now()
          let faults = [0, 0, 0] // negative orders for: offsets, times, both
          let logs = buffer.toString('utf8')
          logs = logs.split('\n')
          let short = nmb.bot[channel].log
          let skipped = 0
          logs.forEach(element => {
            let logObj = parseLog(element)
            if (logObj !== false) {
              let res = track(short, logObj.user, null, ~~logObj.ms)
              if (res) faults[res - 1]++
            } else skipped++
            short['$log_offset'] += Buffer.byteLength(element, 'utf8') + 1 // +1 due to \n being removed with split
          })
          if (faults !== [0, 0, 0]) console.log(`* [${channel}] Log faults: Offsets: ${faults[0] + faults[2]} Times: ${faults[1] + faults[2]} (offset faults are bad but time faults may be just fine. A fault is considered to happen when a log has lower offset or time than its previous log)`)
          console.log(`* [${channel}] Tracked ${logs.length - skipped} log lines in about ${Date.now() - startTime} ms`)
          // last line is '' with no /n but stats.size is absolute so no worries :)
          short['$log_offset'] = stats.size
          resolve()
        })
      })
    })
  })
}

module.exports.startStream = (channel) => {
  fs.stat(`./data/${channel}/log.txt`, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        nmb.bot[channel].log['$log_offset'] = 0
        stats = { 'size': 0 }
      } else throw err
    }
    if (stats.size !== nmb.bot[channel].log['$log_offset']) {
      console.log(`* [${channel}] Offset mismatch`)
      console.log(`Real: ${stats.size} !== ${nmb.bot[channel].log['$log_offset']} :Tracked`)
      if (stats.size > nmb.bot[channel].log['$log_offset']) { // Json is behind logs
        trackLog(channel, nmb.bot[channel].log['$log_offset']).then(() => {
          streams[channel] = fs.createWriteStream(`./data/${channel}/log.txt`, { flags: 'a' })
        }).catch((err) => {
          console.log(err)
        })
      } else { // Json is ahead logs? Log.txt was probably cleared
        console.log(`* [${channel}] Log json ahead of log txt. Likely due to manually editing log.txt`)
        console.log(`* [${channel}] Retracking completely!`)
        delete nmb.bot[channel].log
        nmb.bot[channel].log = {
          '$log_offset': 0,
          '$messages': 0,
          '$users': 0,
          '$start_time': null,
          '$end_time': null
        }
        trackLog(channel, 0).then(() => {
          streams[channel] = fs.createWriteStream(`./data/${channel}/log.txt`, { flags: 'a' })
        }).catch((err) => {
          console.log(err)
        })
      }
    } else streams[channel] = fs.createWriteStream(`./data/${channel}/log.txt`, { flags: 'a' })
  })
}
module.exports.endStream = (channel) => {
  if (!channel) console.log(`* Error: Channel was false`)
  if (!(channel in streams)) {
    console.log(`* [${channel}] Ignored endStream() as channel's write stream doesn't exist`)
    return
  }
  streams[channel].end()
  delete streams[channel]
  if ((nmb.bot[channel] || {}).log) return console.log(`* [${channel}] Tried saving undefined log`)
  fs.writeFile(`./data/${channel}/log.json`, JSON.stringify(nmb.bot[channel].log, null, '\t'), 'utf8', (err) => {
    if (err) throw err
    delete nmb.bot[channel].log
    console.log(`* [${channel}] Saved log.json and ended stream`)
  })
}
// primarily used on exit
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

// turn log string in to a log object { ms: any; type: any; user: any; message: any; }
function parseLog (raw) {
  if (raw === '') return false
  if (raw.indexOf('\n') !== -1) {
    raw = raw.substring(0, raw.indexOf('\n'))
  }
  let obj = {}

  let pos = raw.indexOf(':')
  obj.ms = raw.substring(0, pos)
  if (obj.ms === '') return false

  let oldPos = pos
  pos = raw.indexOf(':', pos + 1)
  obj.type = raw.substring(oldPos + 1, pos)
  if (obj.type === '') return false

  oldPos = pos
  pos = raw.indexOf(':', pos + 1)
  obj.user = raw.substring(oldPos + 1, pos)
  if (obj.user === '') return false

  oldPos = pos
  pos = raw.indexOf(':', pos + 1)
  obj.message = raw.substring(oldPos + 1, raw.length)
  // if (obj.message === '') return false // message can be truly empty?
  return obj
}

function logDate () { // get time in ms at 1 seconds precision
  return Math.round(Date.now() / 1000)
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
  'user0': [
    '1010230, // user id
    [ // byte offsets ADDITIVE

    ],[ // time (ms / 1000) Second precision ADDITIVE

    ]
  ],
  ...
}
*/
