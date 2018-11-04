let votes = {}
let timeout
let minVotes = 10
let voteEndTime = 5 // Seconds until vote ends without new votes

module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (!votes[params[0]]) votes[params[0]] = 0
    votes[params[0]]++
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      let total = 0
      let msg = ''

      for (let element in votes) {
        if (votes[element] !== 1) total += +votes[element]
        else delete votes[element]
      }
      if (total < minVotes) {
        for (let element in votes) delete votes[element]
        resolve(null)
      } else {
        for (let element in votes) {
          if (votes[element] === total) {
            for (let element in votes) delete votes[element]
            resolve(null)
          }
          msg += `| ${element}: ${Math.round(votes[element] / total * 100)}% `
        }
        for (let element in votes) delete votes[element]
        // Votes displayed like: '| 1: 25% | 2: 45% |'
        resolve(`${msg} |`)
      }
    }, voteEndTime * 1000)
  })
}

module.exports.help = () => {
  return new Promise((resolve, reject) => {
    resolve(`This command is counted as a vote. 
      After ${voteEndTime} seconds of no votes, the votes are displayed in chat. ${minVotes} votes minimum`)
  })
}
