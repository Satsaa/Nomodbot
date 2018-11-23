var fs = require('fs')
var request = require('request')
let mu = require('../../myutil.js')
var striptags = require('striptags')
var stringSim = require('string-similarity')

let sets = [
]

for (let i = 0; i < 100; i++) { // require all existing sets
  try {
    sets[i] = require(`../../../data/global/artifact/${i}.json`)
  } catch (err) {
    break
  }
}

if (sets.length === 0) {
  update(true).catch((err) => {
    console.log(`* [ARTIFACTCARD] Failed downloading card set data: ${err}`)
  })
}

let lastTime = 0
let name = 'mars' // declare here as it is also used to see if there is a duplicate call
module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (!params[1]) return resolve('You must define a card name (params 1+)')
    if (params[1].toLowerCase() === 'update') {
      if (Date.now() > expire || nmb.bot.config.masters.includes(userstate['username'])) {
        update().then((setNum) => {
          if (!added.length) added.push('None')
          if (!updated.length) updated.push('None')
          resolve(`Added: ${added.join(', ')}. Updated:  ${updated.join(', ')}.`)
        }).catch((err) => {
          resolve(`Update failed: ${err}`)
        }).finally(() => {
          added = []
          updated = []
        })
      } else resolve(`Updating is on cooldown for ${mu.timeUntill(expire, 1, false)}!`)
      return
    }

    let search = params.slice(1).join(' ')
    let short, cards
    let MatchStr = '' // For string similarity matching

    let card = false
    for (let ii = 0; ii < sets.length; ii++) { // find exact matches
      short = sets[ii].card_set.card_list
      for (let i = 0; i < short.length; i++) {
        if (short[i].card_name.english.toLowerCase().replace(/'/gi, '') === search.toLowerCase().replace(/'/gi, '')) {
          card = short[i]
          cards = sets[ii]
          break
        }
      }
      if (card) break
    }
    if (!card) { // no exact match. Perform search
      let highest = 0; let set = 0; let index = 0
      for (let ii = 0; ii < sets.length; ii++) {
        short = sets[ii].card_set.card_list
        for (let i = 0; i < short.length; i++) {
          // Give high points if is abbreviation. Eg cm -> Crystal Maiden but not es -> Earthshaker
          let abb = short[i].card_name.english.split(' ')
          let abbParsed = ''
          abb.forEach(e => {
            abbParsed += e.charAt(0)
          })
          let thisSim = stringSim.compareTwoStrings(short[i].card_name.english, search)

          if (abbParsed.toLowerCase() === search.toLowerCase()) {
            if (short[i].card_type === 'Hero') thisSim += 0.30
            thisSim += 0.60
          }
          if (thisSim > highest) {
            highest = thisSim; set = ii; index = i
          }
        }
      }
      short = sets[set].card_set.card_list
      card = short[index]
      console.log(`Score: ${highest}. Search: ${search}. Card: ${card.card_name.english}`)
      if (highest < 0.001) return resolve(`Cannot find anything for '${search}'`)
      cards = sets[set]
      if (highest < 0.25) MatchStr = 'Weak match: '
    }

    if (name === card.card_name.english && Date.now() < lastTime + 5000) {
      return resolve(null)
    }
    lastTime = Date.now()

    let setStr = ''
    // The game started with 2 sets (base and Call to Arms). Start telling set names when a new set is released
    if (sets.length > 2) setStr = 'from the ' + cards.card_set.set_info.name.english.replace(' Set', '') + ' set'
    name = card.card_name.english
    let nameStyled = mu.fontify(name, 'mathSansBold')

    let type = card.card_type.toLowerCase()
    let subType = card.sub_type ? card.sub_type.toLowerCase() : '' // Accessory Deed etc.....

    let manaStr = card.mana_cost ? card.mana_cost + ' mana' : ''
    let costStr = card.gold_cost ? card.gold_cost + ' gold' : ''

    let rarity = card.rarity ? card.rarity.toLowerCase() : ''

    let color = mu.commaPunctuate([card.is_red ? 'red' : '', card.is_green ? 'green' : '', card.is_blue ? 'blue' : '', card.is_black ? 'black' : ''])

    let statsStr = `${card.attack || 0}/${card.armor ? card.armor + '/' : ''}${card.hit_points || 0}`
    statsStr = `with ${statsStr === '0/0' ? 'no' : statsStr} stats`

    let text = card.card_text.english || ''

    let includesStr = [] // eg cards icluded with heroes
    let references = [] // any other reference type

    // gather references
    for (let ii = 0; ii < sets.length; ii++) {
      let short = sets[ii].card_set.card_list // own instance of short is used
      for (let i = 0; i < card.references.length; i++) {
        for (let ii = 0; ii < short.length; ii++) {
          if (short[ii].card_id === card.references[i].card_id) {
            if (card.references[i].ref_type === 'includes') includesStr.push(short[ii].card_name.english)
            else if (short[ii].card_name.english !== name) references.push(short[ii].card_name.english)
            break
          }
        }
      }
    }
    if (includesStr.length) includesStr = `Signature card: ${mu.fontify(mu.commaPunctuate(includesStr), 'mathSansBold')}.`
    else includesStr = ''

    if (text) {
      text = striptags(card.card_text.english.replace(/ {2}/gi, ' ⮮⮭ '))

      text = text.replace('Get initiative', ' 🗲 Get initiative')

      let match // Insert ◳ like: Active 4 -> Active ◳4
      while ((match = /active \d+/gi.exec(text)) != null) {
        text = [text.slice(0, match.index + 7), ' ◳ ', text.slice(match.index + 7)].join('')
      }

      references.forEach(element => {
        if (type === 'hero') text = text.replace(element, mu.fontify(element, 'mathSansBold') + ': ')
        else text = text.replace(element, mu.fontify(element, 'mathSansBold'))
      })
    }

    let illustratorStr = card.illustrator ? mu.fontify('Art ' + card.illustrator, 'mathSansItalic') : ''

    // let whosePassive = null // for passives we get the owner of that passive. Passives not on wiki yet
    if (type === 'passive ability') {
      // short = sets[ii].card_set.card_list
      for (let i = 0; i < short.length; i++) {
        let referenceIds = []
        short[i].references.forEach(element => {
          referenceIds.push(element.card_id)
        })
        if (referenceIds.indexOf(card.card_id) !== -1) {
          var whosePassive = short[i].card_name.english
          text = text.replace(whosePassive, mu.fontify(whosePassive, 'mathSansBold'))
          break
        }
      }
    }
    let link = `artifact.gamepedia.com/${(whosePassive || name).replace(/ /gi, '_').replace(/'/g, '%27')}`

    switch (type) {
      case 'hero' :
      case 'creep':
        // nocost
        resolve(`${MatchStr}${nameStyled} is ${mu.addArticle(`${s(rarity)}${s(color)}${s(manaStr)}${s(type)}${s(statsStr)}${s(setStr)}${text ? ': ' + text : ' and has no special text.'}${s(includesStr)}${s(illustratorStr)}${s(link)}`)}`)
        break

      case 'item':
        // cost nomana nostats
        resolve(`${MatchStr}${nameStyled} is ${mu.addArticle(`${costStr}${s(rarity)} ${subType}${s(type)}${s(setStr)}${text ? ': ' + text : ' and has no special text?'}${s(includesStr)}${s(illustratorStr)}${s(link)}`)}`)
        break

      case 'ability':
      case 'passive ability':
        // nostats nocolor
        resolve(`${MatchStr}${nameStyled} is ${mu.addArticle(`${s(rarity)}${s(manaStr)}${s(type)}${s(setStr)}${text ? ': ' + text : ' and has no special text.'}${s(includesStr)}${s(illustratorStr)}${s(link)}`)}`)
        break

      case 'improvement':
      case 'spell':
        // nostats
        resolve(`${MatchStr}${nameStyled} is ${mu.addArticle(`${s(rarity)}${s(color)}${s(manaStr)}${s(type)}${s(setStr)}${text ? ': ' + text : ' and has no special text.'}${s(includesStr)}${s(illustratorStr)}${s(link)}`)}`)
        break

      case 'stronghol1d':
      case 'pathi1ng': // why not
        resolve(`${MatchStr}${nameStyled} is ${mu.addArticle(`${s(rarity)}${s(color)}${s(manaStr)}${s(type)}${s(statsStr)}${s(setStr)}${text ? ': ' + text : ' and has no special text.'}${s(includesStr)}${s(illustratorStr)}${s(link)}`)}`)
        // console.log(`* [${channel}] Unknown Artifact card type:${s(type)}`)
        break

      default:

        resolve(`${MatchStr}${nameStyled} is ${mu.addArticle(`${s(rarity)}${s(color)}${s(manaStr)}${s(type)}${s(statsStr)}${s(setStr)}${text ? ': ' + text : ' and has no special text.'}${s(includesStr)}${s(illustratorStr)}${s(link)}`)}`)
        // console.log(`* [${channel}] Unknown Artifact card type:${s(type)}`)
        break
    }
    /** Just prepends a space if str is true
     */
    function s (str) {
      if (str) return ' ' + str
      else return str
    }
  })
}

let expire = 0
/**
 * Retrieves the card sets from valve api
 * @param {boolean} suppress Supresses stat errors in log
 * @returns {number} Number of sets downloaded
 */
var added = []
var updated = []
function update (suppress = false) {
  return new Promise((resolve, reject) => {
    console.log(`* [ARTIFACTCARD] Downloading card set data`)
    loop(0) // start

    function loop (setNum) {
      request.get({ uri: `https://playartifact.com/cardset/${setNum}` }, (err, res, body) => {
        if (err) reject(new Error(`At ${setNum}: ${err}`))
        body = JSON.parse(body)
        // console.log(body)

        if (Object.keys(body).length === 0) {
          console.log(`* [ARTIFACTDECK] Downloaded ${setNum} card sets`)
          resolve(setNum)
          return
        }

        expire = body.expire_time * 1000

        let opts = {
          method: 'GET',
          uri: body.cdn_root.replace('https', 'http') + body.url.substring(1),
          port: 80
        }

        request.get(opts, (err, res, body) => { // body is plain json
          if (err) return reject(new Error(`At ${setNum}: ${err}`))
          let prevLength = sets[setNum] ? Object.keys(sets[setNum].card_set.card_list).length : null

          fs.stat(`./data/global/artifact/${setNum}.json`, (err, stats) => {
            sets[setNum] = JSON.parse(body) // parse and save to memory
            if (!sets[setNum]) return reject(new Error('Failed to parse correctly. This command is now unstable monkaS'))
            if (err) {
              if (!suppress) console.log(err)
            } else { // stat() failed
              var prevSize = stats.size
              var keyLength = Object.keys(sets[setNum].card_set.card_list).length
              if (prevLength !== null) { // Gather changed card amounts
                if (prevLength !== keyLength) {
                  updated.push(sets[setNum].card_set.set_info.name.english)
                  updated[updated.length - 1] += `: ${keyLength - prevLength} cards`
                }
              } else { // Gather new sets!
                added.push(sets[setNum].card_set.set_info.name.english)
              }
            }

            fs.writeFile(`./data/global/artifact/${setNum}.json`, JSON.stringify(sets[setNum], null, '\t'), (err) => {
              if (err) return reject(new Error(`At ${setNum}: ${err}`))

              fs.stat(`./data/global/artifact/${setNum}.json`, (err, stats) => {
                if (err) {
                  if (!suppress) console.log(err)
                  updated.push(sets[setNum].card_set.set_info.name.english)
                  updated[updated.length - 1] += err
                } else if (typeof keyLength !== 'undefined' || typeof prevSize !== 'undefined') {
                  if (prevLength === keyLength && prevSize !== stats.size) { // Gather changed byte size
                    updated.push(sets[setNum].card_set.set_info.name.english)
                    updated[updated.length - 1] += `: ${stats.size - prevSize} bytes`
                  }
                }
                console.log(`* [ARTIFACTDECK] Downloaded ${sets[setNum].card_set.set_info.name.english}`)
                loop(++setNum)
              })
            })
          })
        })
      })
    }
  })
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Get info about an Artifact card: ${params[1]} <card...>. Refresh card database: ${params[1]} update`)
  })
}
