let votes = []
let timeouts = []
let voteWaits = []

let minVotes = 1 // minimum votes for a single option to be counted
let minTotalVotes = 5 // minimum total votes

let waitMultiplier = 0.9 // For each vote, voteEndTime is multiplied by this
let minWait = 3500 // Minimum ms wait duration
let voteEndTime = 10000 // Ms until vote ends without new votes

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (typeof voteWaits[channel] === 'undefined') {
      voteWaits[channel] = voteEndTime // initilize on first vote
    } else voteWaits[channel] = voteWaits[channel] * waitMultiplier // apply multiplier on others
    if (voteWaits[channel] < minWait) voteWaits[channel] = minWait // enforce minWait

    if (typeof votes[channel] === 'undefined') votes[channel] = {}

    if (!votes[channel][params[0]]) votes[channel][params[0]] = 0 // initialize this option
    votes[channel][params[0]]++ // add this vote
    if (timeouts[channel]) clearTimeout(timeouts[channel]) // clear previous timeout
    timeouts[channel] = setTimeout(() => { // start next timeout
      let total = 0
      let msg = ''

      for (let element in votes[channel]) {
        if (votes[channel][element] < minVotes) delete votes[channel][element] // enforce single option minimum votes
        else total += +votes[channel][element] // otherwise add to total
      }
      if (total < minTotalVotes) { // enforce minimum votes
        for (let element in votes[channel]) delete votes[channel][element]
        if (total > 2) console.log(`* [${channel}] Not enough numvotes (${total + ' < ' + minTotalVotes})`)
        deleteVote()
        resolve(null)
      } else {
        for (let element in votes[channel]) { // gather votes
          if (element === '0') continue // ignore 0 so it can be put in the end later
          if (votes[channel][element] === total) { // ignore vote if all votes were to a single option
            deleteVote()
            resolve(null)
          }
          msg += `| ${element}: ${Math.round(votes[channel][element] / total * 100)}% `
        }
        for (let element in votes[channel]) { // add 0 options votes at the end
          if (element !== '0') continue
          msg += `| ${element}: ${Math.round(votes[channel][element] / total * 100)}% `
        }
        // Votes displayed like: '| 1: 25% | 2: 45% |'
        console.log(`* [${channel}] Numvote ended: (${total}) ${msg} |`)
        deleteVote()
        resolve(`${msg} |`)
      }

      function deleteVote () { // delete voting variables
        for (let element in votes[channel]) {
          voteWaits[channel] = undefined
          delete votes[channel][element]
        }
      }
    }, voteWaits[channel])
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`${params[1]} is counted as a vote. 
      After ${voteEndTime} seconds (dynamic) of no votes, the votes are displayed in chat. ${minTotalVotes} votes minimum`)
  })
}
