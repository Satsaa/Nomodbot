const fs = require('fs')

emitter.on('joinChannel', (channel) => {
  this.startStream(channel)
})

emitter.on('partChannel', (channel) => {
  this.endStream(channel)
})

emitter.on('onExit', (channels) => {
  channels.forEach((channel) => {
    this.endStreamSync(channel)
  })
})

emitter.on('onsave', save)

function save () {
  if (nmb.bot.log) {
    fs.writeFile('./data/global/log.json', JSON.stringify(nmb.bot.internal, null, 2), 'utf8', (err) => {
      if (err) throw err
      else console.log(`* [LOGGER] Saved`)
    })
  } else console.log('* [LOGGER] log undefined and therefore not saved')
}

let streams = {}
const types = {
  'message': 'c',
  'action': 'a',
  'sub': 's',
  'gift': 'g',
  'massgift': 'm',
  'timeout': 't',
  'ban': 'b',
  'mod': 'u',
  'unmod': 'd'
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

      let line = `${logDate()}:${type}:${name}:${message}\n`
      track(channel, name, userId, logDate())

      nmb.bot.log[channel]['offset'] += Buffer.byteLength(line, 'utf8')
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
        else resolve(parse)
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
function track (channel, name, userId, dateSec) {
  let short = nmb.bot[channel].log
  let shortG = nmb.bot.log[channel]

  name = name.toLowerCase()
  if (shortG['messages'] === 0) {
    shortG['start_time'] = dateSec
  }
  shortG['messages']++
  shortG['end_time'] = dateSec

  if (!((short || {})[name])) { // first messaged from user
    if (typeof short === 'undefined') {
      nmb.bot[channel].log = {}
      short = nmb.bot[channel].log
    }

    shortG['users']++
    short[name] = [ // initialize users object
      userId,
      [shortG['offset']], // offsets
      [dateSec] // times (ms / 1000) Second precision
    ]
  } else { // continue users object
    if (!short[name][0]) short[name][0] = userId
    let offset = getOffset(short, name, short[name][1].length)
    let time = getTime(short, name, short[name][2].length)

    short[name][1].push(shortG['offset'] - offset)
    short[name][2].push(dateSec - time)

    if (short[name][1][short[name][1].length - 1] === null) {
      if (short[name][2][short[name][2].length - 1] === null) return 6 // both NULL
      else return 4 // offset NULL
    } else if (short[name][2][short[name][2].length - 1] === null) return 5 // time NULL

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
      if (err) {
        if (err.code === 'ENOENT') {
          fs.writeFile(`./data/${channel}/log.txt`, '', (err) => {
            if (err) return reject(err)
            else {
              nmb.bot.log[channel] = {
                'offset': 0,
                'messages': 0,
                'users': 0,
                'start_time': null,
                'end_time': null
              }
              save()
              console.log(`* [channel] Log.txt was missing: Reseted log stats`)
              return resolve()
            }
          })
        } else return reject(err)
        return
      }
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
          let faults = [0, 0, 0, 0, 0, 0] // negative orders for: offsets, times, both and nulls for each
          let logs = buffer.toString('utf8')
          logs = logs.split('\n')
          let shortG = nmb.bot.log[channel]
          let skipped = 0
          logs.forEach(element => {
            let logObj = parseLog(element)
            if (logObj !== false) {
              let res = track(channel, logObj.user, null, ~~logObj.ms)
              if (res) faults[res - 1]++ // add to fault counter array
            } else skipped++
            shortG['offset'] += Buffer.byteLength(element, 'utf8') + 1 // +1 due to \n being removed with split
          })
          console.log(`* [${channel}] Tracked ${logs.length - skipped} log lines in about ${Date.now() - startTime} ms`)
          if (faults !== [0, 0, 0, 0, 0, 0]) {
            console.log(`* [${channel}] Log negatives: who cares`)
            console.log(`* Offsets: ${faults[0] + faults[2]}, Times: ${faults[1] + faults[2]}`)
            console.log(`* [${channel}] Log nulls: you a fucked`)
            console.log(`* Offsets: ${faults[3] + faults[5]}, Times: ${faults[4] + faults[5]}`)
          }
          // last line is '' with no /n but stats.size is absolute so no worries :)
          shortG['offset'] = stats.size

          save()
          resolve()
        })
      })
    })
  })
}

module.exports.startStream = (channel) => {
  fs.stat(`./data/${channel}/log.txt`, (err, stats) => {
    let short = nmb.bot[channel].log
    let shortG = nmb.bot.log[channel]
    if (err) {
      if (err.code === 'ENOENT') {
        short['offset'] = 0
        stats = { 'size': 0 }
      } else throw err
    }
    if (stats.size !== shortG['offset']) {
      console.log(`* [${channel}] Offset mismatch`)
      console.log(`Real: ${stats.size} !== ${shortG['offset']} :Tracked`)
      if (stats.size > shortG['offset']) { // Json is behind logs
        trackLog(channel, shortG['offset']).then(() => {
          streams[channel] = fs.createWriteStream(`./data/${channel}/log.txt`, { flags: 'a' })
        }).catch((err) => {
          console.log(err)
        })
      } else { // Json is ahead logs? Log.txt was probably cleared
        console.log(`* [${channel}] Log json ahead of log txt. Likely due to manually editing log.txt`)
        console.log(`* [${channel}] Retracking completely!`)
        delete nmb.bot[channel].log
        nmb.bot.log[channel] = {
          'offset': 0,
          'messages': 0,
          'users': 0,
          'start_time': null,
          'end_time': null
        }
        shortG = nmb.bot.log[channel]
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
  if (!channel) console.log(`* Error: Channel was false: ${channel}`)
  if (!(channel in streams)) {
    console.log(`* [${channel}] Ignored endStream() as channel's write stream doesn't exist`)
    return
  }
  streams[channel].end()
  delete streams[channel]
  if ((nmb.bot[channel] || {}).log) {
    fs.writeFile(`./data/${channel}/log.json`, JSON.stringify(nmb.bot[channel].log, null, '\t'), 'utf8', (err) => {
      if (err) throw err
      delete nmb.bot[channel].log
      console.log(`* [${channel}] Saved log.json and ended stream`)
    })
  } else {
    delete nmb.bot[channel].log
    return console.log(`* [${channel}] Tried saving undefined log`)
  }
}
// primarily used on exit
module.exports.endStreamSync = (channel) => {
  if (!(channel in streams)) {
    console.log(`* [${channel}] Ignored endStreamSync() as channel's write stream doesn't exist`)
    return
  }
  streams[channel].end()
  delete streams[channel]

  if (typeof nmb.bot[channel].log !== 'undefined') {
    fs.writeFileSync(`./data/${channel}/log.json`, JSON.stringify(nmb.bot[channel].log, null, '\t'), 'utf8')
    console.log(`* [${channel}] Saved log.json and ended stream`)
  } else console.log(`* [${channel}] Log undefined, didn't save log.json but ended stream`)

  delete nmb.bot[channel].log
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
