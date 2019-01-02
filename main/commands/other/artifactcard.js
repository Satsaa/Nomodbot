var fs = require('fs')
var request = require('request')
let mu = require('../../myutil.js')
var striptags = require('striptags')

// stats

var ignorePeriod = 15000 // ms untill you can call a recent card again
var ignoreMemorized = 5 // how many previous calls to remember
var priceExpireTime = 60 * 60 * 1000 // 1 hour // how long untill prices may be refreshed

let sets = []
for (let i = 0; i < 100; i++) { // require all existing sets
  try {
    sets[i] = require(`../../../data/global/artifact/${i}.json`)
  } catch (err) {
    var [nameList, idList, abbrevList] = createLists(sets)
    initSearcher(nameList)
    break
  }
}

var priceTime = 0
var prices = {}
var totalCostAlt = 0
var highestCost = 0
var highestCostName = 'iceFrog'
function getPrices (cardName, forceUpdate = 0) { // return cards price and gets the prices from the api if needed
  return new Promise((resolve, reject) => {
    if (forceUpdate || priceTime + priceExpireTime < Date.now()) {
      console.log('updating prices')
      request.get({ uri: `https://rwcs3dt4h2.execute-api.us-west-2.amazonaws.com/default/get-artifact-cards` }, (err, res, body) => {
        if (err) {
          console.log(`*  [ARTIFACTCARD] Error getting prices: ${err}`)
          return prices[cardName] ? resolve(prices[cardName].price) : resolve(null)
        }
        body = JSON.parse(body)
        for (var prop in prices) { if (prices.hasOwnProperty(prop)) { delete prices[prop] } } // delete entries

        totalCostAlt = 0
        highestCost = 0
        for (let i = 0; i < body.Items.length; i++) {
          let element = body.Items[i]
          prices[element.name] = {
            price: (element.sell_price / 100).toFixed(2),
            listings: element.sell_listings
          }
          totalCostAlt += element.sell_price / 100
          if (element.sell_price / 100 > highestCost) {
            highestCost = (element.sell_price / 100).toFixed(2)
            highestCostName = element.name
          }
        }
        totalCostAlt = totalCostAlt.toFixed(2)
        priceTime = Date.now()
        console.log('updated prices')
        return prices[cardName] ? resolve(prices[cardName].price) : resolve(null)
      })
    } else return prices[cardName] ? resolve(prices[cardName].price) : resolve(null)
  })
}

var totalCost = 0
function getTotal (cardName, forceUpdate = 0) { // return cards price and gets the prices from the api if needed
  return new Promise((resolve, reject) => {
    console.log('updating total')
    request.get({ uri: `https://nt8g24o0wa.execute-api.us-west-2.amazonaws.com/default/artifact-get-any-total` }, (err, res, body) => {
      if (err) {
        console.log(`*  [ARTIFACTCARD] Error getting total price: ${err}`)
      }
      let highestTime = 0
      let highest
      body = JSON.parse(body)
      for (let i = 0; i < body.Items.length; i++) {
        let element = body.Items[i]
        if (element.timestamp > highestTime) {
          highestTime = element.timestamp
          highest = element.total
        }
      }
      console.log('updated total')
      totalCost = (highest / 100).toFixed(2)
      resolve()
    })
  })
}

if (sets.length === 0) {
  update(true).catch((err) => {
    console.error(`* [ARTIFACTCARD] Failed downloading card set data: ${err}`)
  })
}

let lastTime = [0]
let name = ['icefrog'] // declare here as it is also used to see if there is a duplicate call
lastTime.length = ignoreMemorized
name.length = ignoreMemorized
module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (!params[1]) { // if only the command is called, return a bunch of stats and a hint to add a card name
      Promise.all([getPrices('', 1), getTotal()]).then(() => {
        let setList = []
        let totalCards = 0
        let typeCounts = {}
        sets.forEach(element => {
          setList.push(mu.cap(element.card_set.set_info.name.english))
          totalCards += element.card_set.card_list.length
          for (let i = 0; i < element.card_set.card_list.length; i++) {
            let type = element.card_set.card_list[i].card_type
            if (!typeCounts.hasOwnProperty(type)) typeCounts[type] = 1
            else typeCounts[type]++
          }
        })
        let typeStrs = []
        for (const key in typeCounts) {
          typeStrs.push(`${key}: ${typeCounts[key]}`)
        }
        return resolve(`Add a card name to search invidual cards stats. There are ${sets.length} sets: [${setList.join(', ')}]. The cards cost a total of $${totalCost} with the highest card ${highestCostName} costing $${highestCost}. ${totalCards} cards: [${typeStrs.join(', ')}]`)
      })
    } else {
      if (params[1].toLowerCase() === 'update') {
        if (Date.now() > expire || nmb.bot.config.masters.includes(userstate['username'])) {
          update().then((setNum) => {
            if (!added.length) added.push('None')
            if (!updated.length) updated.push('None')
            resolve(`Added: ${added.join(', ')}. Updated:  ${updated.join(', ')}.`)
          }).catch((err) => {
            resolve(`Update failed: ${err}`)
          }).finally(() => {
            [nameList, idList, abbrevList] = createLists(sets)
            initSearcher(nameList)
            added = []
            updated = []
          })
        } else resolve(`Updating is on cooldown for ${mu.timeUntill(expire, 1, false)}!`)
        return
      }

      let search = params.slice(1).join(' ')

      let abbrevIndex = abbrevList.lastIndexOf(search.toLowerCase())
      if (abbrevIndex !== -1) { // Check if valid abbreviation
        var card = sets[idList[abbrevIndex].set_id].card_set.card_list[idList[abbrevIndex].card_id]
        var cards = sets[idList[abbrevIndex].set_id]
      } else { // Otherwise search in all cards
        let result = fuse.search(search)
        if (result.length === 0) return resolve(`@${userstate['username']} Couldn't find '${search}' :(`)
        card = sets[idList[result[0].item].set_id].card_set.card_list[idList[result[0].item].card_id]
        cards = sets[idList[result[0].item].set_id]
      }

      let lastIndex = name.indexOf(card.card_name.english)
      if (lastIndex !== -1 && Date.now() < lastTime[lastIndex] + ignorePeriod) { // ignore repetive requests
        if (!nmb.bot.config.masters.includes(userstate['username'])) { return resolve(null) } // not for masta
      }
      lastTime.unshift(Date.now())
      lastTime.pop()

      name.unshift(card.card_name.english)
      name.pop()

      getPrices(name[0]).then((price) => {
        let nameStyled = mu.fontify(name[0], 'mathSansBold')

        // The game started with 2 sets (base and Call to Arms). Start telling set names when a new set is released
        let setStr = ''
        if (sets.length > 2) setStr = 'from the ' + cards.card_set.set_info.name.english.replace(' Set', '') + ' set'

        let type = card.card_type.toLowerCase()
        let subType = card.sub_type ? card.sub_type.toLowerCase() : '' // Accessory Deed etc.....

        let manaStr = card.mana_cost ? card.mana_cost + ' mana' : ''
        let costStr = card.gold_cost ? card.gold_cost + ' gold' : ''

        let rarity = card.rarity ? card.rarity.toLowerCase() : ''

        let color = mu.commaPunctuate([card.is_red ? 'red' : '', card.is_green ? 'green' : '', card.is_blue ? 'blue' : '', card.is_black ? 'black' : ''])

        let statsStr = `${card.attack || 0}/${card.armor ? card.armor + '/' : ''}${card.hit_points || 0}`
        statsStr = `with ${statsStr === '0/0' ? 'no' : statsStr} stats`

        let text = card.card_text.english || ''

        let includeStr = [] // eg cards icluded with heroes
        let references = [] // any other reference type

        // gather references
        for (let ii = 0; ii < sets.length; ii++) {
          let short = sets[ii].card_set.card_list // own instance of short is used
          for (let i = 0; i < card.references.length; i++) {
            for (let ii = 0; ii < short.length; ii++) {
              if (short[ii].card_id === card.references[i].card_id) {
                if (card.references[i].ref_type === 'includes') includeStr.push(short[ii].card_name.english)
                else if (short[ii].card_name.english !== name[0]) references.push(short[ii].card_name.english)
                break
              }
            }
          }
        }
        if (includeStr.length) includeStr = `Signature card: ${mu.fontify(mu.commaPunctuate(includeStr), 'mathSansBold')}.`
        else includeStr = ''

        if (text) {
          text = striptags(card.card_text.english.replace(/ {2}/gi, ' ⮮⮭ '))

          text = text.replace('Play Effect: ⮮⮭ ', 'Play Effect: ')

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
          for (let i = 0; i < cards.length; i++) {
            let referenceIds = []
            cards[i].references.forEach(element => {
              referenceIds.push(element.card_id)
            })
            if (referenceIds.indexOf(card.card_id) !== -1) {
              var whosePassive = cards[i].card_name.english
              text = text.replace(whosePassive, mu.fontify(whosePassive, 'mathSansBold'))
              break
            }
          }
        }
        let link = `artifact.gamepedia.com/${(whosePassive || name[0]).replace(/ /gi, '_').replace(/'/g, '%27')}`

        switch (type) {
          case 'hero' :
          case 'creep':
            // nocost
            resolve(`${nameStyled} is ${mu.addArticle(`${s(price ? '$' + price : '')}${s(rarity)}${s(color)}${s(manaStr)}${s(type)}${s(statsStr)}${s(setStr)}${text ? ': ' + text : ' and has no special text.'}${s(includeStr)}${s(illustratorStr)}${s(link)}`)}`)
            break

          case 'item':
            // cost nomana nostats
            resolve(`${nameStyled} is ${mu.addArticle(`${s(price ? '$' + price : '')}${s(costStr)}${s(rarity)} ${subType}${s(type)}${s(setStr)}${text ? ': ' + text : ' and has no special text?'}${s(includeStr)}${s(illustratorStr)}${s(link)}`)}`)
            break

          case 'ability':
          case 'passive ability':
            // nostats nocolor
            resolve(`${nameStyled} is ${mu.addArticle(`${s(price ? '$' + price : '')}${s(rarity)}${s(manaStr)}${s(type)}${s(setStr)}${text ? ': ' + text : ' and has no special text.'}${s(includeStr)}${s(illustratorStr)}${s(link)}`)}`)
            break

          case 'improvement':
          case 'spell':
            // nostats
            resolve(`${nameStyled} is ${mu.addArticle(`${s(price ? '$' + price : '')}${s(rarity)}${s(color)}${s(manaStr)}${s(type)}${s(setStr)}${text ? ': ' + text : ' and has no special text.'}${s(includeStr)}${s(illustratorStr)}${s(link)}`)}`)
            break

          case 'stronghold':
          case 'pathing': // why not
            resolve(`${nameStyled} is ${mu.addArticle(`${s(price ? '$' + price : '')}${s(rarity)}${s(color)}${s(manaStr)}${s(type)}${s(statsStr)}${s(setStr)}${text ? ': ' + text : ' and has no special text.'}${s(includeStr)}${s(illustratorStr)}${s(link)}`)}`)
            // console.error(`* [${channel}] Unknown Artifact card type:${s(type)}`)
            break

          default:

            resolve(`${nameStyled} is ${mu.addArticle(`${s(price ? '$' + price : '')}${s(rarity)}${s(color)}${s(manaStr)}${s(type)}${s(statsStr)}${s(setStr)}${text ? ': ' + text : ' and has no special text.'}${s(includeStr)}${s(illustratorStr)}${s(link)}`)}`)
            // console.error(`* [${channel}] Unknown Artifact card type:${s(type)}`)
            break
        }
      })
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
          getPrices('', 1)
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
              if (!suppress) console.error(err)
            } else { // stat() failed
              var prevSize = stats.size
              var keyLength = Object.keys(sets[setNum].card_set.card_list).length
              if (prevLength !== null) { // Gather changed card amounts
                if (prevLength !== keyLength) {
                  updated.push(sets[setNum].card_set.set_info.name.english)
                  updated[updated.length - 1] += `: ${keyLength - prevLength} ${mu.plural(keyLength - prevLength, 'card')}`
                }
              } else { // Gather new sets!
                added.push(sets[setNum].card_set.set_info.name.english)
              }
            }

            fs.writeFile(`./data/global/artifact/${setNum}.json`, JSON.stringify(sets[setNum], null, '\t'), (err) => {
              if (err) return reject(new Error(`At ${setNum}: ${err}`))

              fs.stat(`./data/global/artifact/${setNum}.json`, (err, stats) => {
                if (err) {
                  if (!suppress) console.error(err)
                  updated.push(sets[setNum].card_set.set_info.name.english)
                  updated[updated.length - 1] += err
                } else if (typeof keyLength !== 'undefined' || typeof prevSize !== 'undefined') {
                  if (prevLength === keyLength && prevSize !== stats.size) { // Gather changed byte size
                    if (isNaN(prevSize)) {
                      console.trace('Nanned')
                    }
                    updated.push(sets[setNum].card_set.set_info.name.english)
                    updated[updated.length - 1] += `: ${mu.formatBytes(stats.size - prevSize, 1)}`
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

var fuse, Fuse

function initSearcher (searchList) { // inits/updates the search list
  Fuse = require('fuse.js')
  fuse = new Fuse(searchList, {
    includeScore: true
  })
}

function createLists (sets) { // creates required lists
  let nameList = []
  let idList = []
  let abbrevList = []

  let heroAbbrevList = [] // helper
  for (let ii = 0; ii < sets.length; ii++) {
    let set = sets[ii].card_set.card_list
    for (let i = 0; i < set.length; i++) {
      idList.push({
        set_id: ii,
        card_id: i
      })
      nameList.push(set[i].card_name.english.toLowerCase())
      // Populate abbreviation list. Hero cards are prioritized
      let abb = set[i].card_name.english.split(' ')
      let abbParsed = ''
      abb.forEach(e => {
        abbParsed += e.charAt(0)
      })
      abbrevList.push(abbParsed.toLowerCase())
      if (set[i].card_type === 'Hero') {
        if (heroAbbrevList.indexOf(abbParsed) === -1) { // remove other entries because they are of non-heroes
          for (let index = 0; index < abbrevList.length - 1; index++) { // latest index not in range
            if (abbParsed === abbrevList[index]) { // exists in array
              abbrevList[index] = '' // "remove" entry from array
            }
          }
        }
        heroAbbrevList.push(abbParsed) // list that this abbreviation is of a hero
      } else {
        if (heroAbbrevList.indexOf(abbParsed) !== -1) {
          abbrevList[abbrevList.length - 1] = ''
        }
      }
    }
  }
  // console.log(abbrevList)
  return [nameList, idList, abbrevList]
}

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Get info about an Artifact card: ${params[1]} <card...>. Refresh card database: ${params[1]} update. Note: Boldened words are referenced cards and are valid cards.`)
  })
}
