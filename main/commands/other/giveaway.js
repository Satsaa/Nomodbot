
module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    let short = nmb.bot[channel]
    if (typeof short.giveaway === 'undefined') return resolve('error :(')
    if (!params[1]) return resolve(`Start, continue or end a giveaway: ${params[0]} <start|continue|end>. Pick a winner: ${params[0]} pick [<count>]. Show winners of current giveaway: ${params[0]} winners. Edit preferences: ${params[0]} set <subonly|subpower> [<value>]. Default power is 1`)
    switch (params[1].toLowerCase()) {
      case 'start':
      case 'begin':
      case 'open':
        short.giveaway.active = true
        short.giveaway.winners = []
        short.giveaway.voters = {}
        let joinCom = getCommand(short.commands, 'giveawayjoin')

        if (short.giveaway.subOnly) {
          if (joinCom === null) resolve(`Sub only giveaway started! JOIN COMMAND IS NOT SET, NOBODY CAN JOIN :o `)
          else resolve(`Sub only giveaway started! Type ${joinCom} to join!`)
        } else {
          if (joinCom === null) resolve(`Giveaway started! JOIN COMMAND IS NOT SET, NOBODY CAN JOIN :o `)
          else resolve(`Giveaway started! Type ${joinCom} to join!`)
        }
        save(channel)
        break
      case 'continue':
      case 'reopen':
        joinCom = getCommand(short.commands, 'giveawayjoin')
        short.giveaway.active = true
        if (joinCom === null) resolve(`Giveaway continued. JOIN COMMAND IS NOT SET, NOBODY CAN JOIN :o `)
        else resolve(`Giveaway continued. Type ${joinCom} to join!`)
        break
      case 'end':
      case 'stop':
      case 'close':
        short.giveaway.active = false
        resolve(`Giveaway ended! @${userstate['display-name']} Announce a new winner: ${params[0]} pick [<count>]`)
        save(channel)
        break
      case 'rig':
        resolve(`@${userstate['display-name']} You won the giveaway!`)
        break
      case 'pick':
      case 'winner':
        if (Object.keys(short.giveaway.voters).length !== 0) {
          let count = params[2]
          let winner = getWinner(short.giveaway)
          short.giveaway.winners.push(winner)
          resolve(`@${winner} You won the giveaway!`)
        } else resolve(`No participants on record. Try "${params[0]} start" to open a giveaway`)
        save(channel)
        break

      case 'last':
      case 'previous':
      case 'winners':
        if (short.giveaway.winners.length) resolve(`Winners of ${short.giveaway.active ? 'current' : 'previous'} giveaway: ${short.giveaway.winners.join(', ')}`)
        else resolve(`No winners chosen yet. "${params[0]} pick" to pick one`)
        break
      case 'set':
      case 'edit':
      case 'modify':
        switch (params[2].toLowerCase()) {
          case 'subonly':
            short.giveaway.subOnly = !short.giveaway.subOnly
            if (short.giveaway.subOnly) resolve(`Sub only giveaways enabled`)
            else resolve(`Sub only giveaways disabled`)
            save(channel)
            break
          case 'subpower':
            if (!params[3]) return resolve(`Define a value (param 3)`)
            if (isNaN(~~params[3])) return resolve(`Param 3 must be a valid number`)
            short.giveaway.subPower = ~~params[3]
            resolve(`Sub power set to ${short.giveaway.subPower}`)
            save(channel)
            break
          default:
            resolve(`unknown setting: ${params[2].toLowerCase()}`)
            break
        }
        break

      default:
        resolve(`Start, continue or end a giveaway: ${params[0]} <start|continue|end>. Pick a winner: ${params[0]} pick [<count>]. Show winners of current giveaway: ${params[0]} winners. Edit preferences: ${params[0]} set <subonly|subpower> [<value>]. Default power is 1`)
        break
    }
  })
}

function getWinner (giveaway) {
  let voters = giveaway.voters
  let totalPower = 0
  for (const voter in voters) { // gather total power
    if (voters[voter].subscriber) { // sub
      totalPower += giveaway.subPower
    } else { // user
      if (!giveaway.subonly) totalPower += 1
    }
  }
  for (const voter in voters) { // gather a winner
    let random = Math.random()
    if (voters[voter].subscriber) { // sub
      if (random > (totalPower - giveaway.subPower) / totalPower) return voters[voter].name // 100 / (100-10 = 90)
      totalPower -= giveaway.subPower
    } else { // user
      if (!giveaway.subonly) {
        if (random > (totalPower - 1) / totalPower) return voters[voter].name // 100 / (100-10 = 90)
        totalPower -= 1
      }
    }
  }
}

function getCommand (commands, value) {
  for (const key in commands) {
    if (commands[key] === value) return key
    if (typeof commands[key] === 'object') {
      if (commands[key].command === value) return key
    }
  } return null
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Start, continue or end a giveaway: ${params[1]} <start|continue|end>. Pick a winner: ${params[1]} pick [<count>]. Show winners of current giveaway: ${params[1]} winners. Edit preferences: ${params[1]} set <subonly|subpower> [<value>]. Default power is 1`)
  })
}

let fs = require('fs')

function save (channel) {
  fs.writeFile('./data/' + channel + '/giveaway.json', JSON.stringify(nmb.bot[channel].giveaway, null, 2), 'utf8', (err) => {
    if (err) throw err
  })
}

emitter.on('partChannel', save)

emitter.on('onExit', (channels) => {
  channels.forEach((channel) => {
    if (nmb.bot[channel].giveaway) fs.writeFileSync('./data/' + channel + '/giveaway.json', JSON.stringify(nmb.bot[channel].giveaway, null, 2), 'utf8')
    else console.error(`Not saved`)
  })
})
