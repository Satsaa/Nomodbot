var request = require('request')
var fs = require('fs')
let mu = require('../../myutil.js')
var striptags = require('striptags')

let sets = [
  require('../../../data/global/artifact/0.json'),
  require('../../../data/global/artifact/1.json')
]

function update (setNum) { // doesnt work. no access for some reason
  request.post({ uri: `https://playartifact.com/cardset/${setNum}` }, (err, res, body) => {
    if (err) return err
    body = JSON.parse(body)
    console.log(body)

    // 0 and 1 should have a populated object
    if (typeof body.cdn_root === 'undefined') return setNum === 0 || setNum === 1 ? 0 : 1

    let opts = {
      method: 'GET',
      uri: body.cdn_root.replace('https', 'http') + body.url.substring(1),
      port: 80
    }

    request.post(opts, (err, res, body) => {
      if (err) return err

      fs.writeFileSync(`./data/global/artifact/${setNum}.json`, JSON.stringify(body, null, 2), (err) => {
        if (err) return err
        update(setNum++)
      })
    })
  })
}

const artifact = new Date('2018-11-19T12:00:00-07:00')
module.exports.run = (channel, userstate, params) => {
  return new Promise((resolve, reject) => {
    if (!params[1]) return resolve('You must define a card name (params 1+)')
    let search = params.slice(1).join(' ')
    let short, cards

    let card = false
    for (let ii = 0; ii < sets.length; ii++) {
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
    if (!card) return resolve(`Cannot find '${search}'`)

    let setStr = 'in the ' + cards.card_set.set_info.name.english.replace(' Set', '') + ' set'
    let name = card.card_name.english
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

    let oldShort = short // gather references
    for (let ii = 0; ii < sets.length; ii++) {
      short = sets[ii].card_set.card_list
      for (let i = 0; i < card.references.length; i++) {
        for (let ii = 0; ii < short.length; ii++) {
          if (short[ii].card_id === card.references[i].card_id) {
            if (card.references[i].ref_type === 'includes') includesStr.push(short[ii].card_name.english)
            else if (short[ii].card_name.english !== name) references.push(short[ii].card_name.english)
            break
          }
        }
      }
    } short = oldShort
    if (includesStr.length) includesStr = `Signature card: ${mu.fontify(mu.commaPunctuate(includesStr), 'mathSansBold')}.`
    else includesStr = ''

    if (text) {
      text = striptags(card.card_text.english.replace(/ {2}/gi, ' ⮮⮭ '))

      text = text.replace('Get initiative', ' 🗲 Get initiative')

      let match // Insert ◳ Active 4 -> Active ◳4
      while ((match = /active \d+/gi.exec(text)) != null) {
        text = [text.slice(0, match.index + 7), ' ◳ ', text.slice(match.index + 7)].join('')
      }

      references.forEach(element => {
        if (type === 'hero') text = text.replace(element, mu.fontify(element, 'mathSansBold') + ': ')
        else text = text.replace(element, mu.fontify(element, 'mathSansBold'))
      })
    }

    let illustratorStr = card.illustrator ? mu.fontify('Art ' + card.illustrator, 'mathSansItalic') : ''

    let whosePassive = null // for passives we get the owner of that passive. Passives not on wiki yet
    if (type === 'passive ability') {
      // short = sets[ii].card_set.card_list
      for (let i = 0; i < short.length; i++) {
        let referenceIds = []
        short[i].references.forEach(element => {
          referenceIds.push(element.card_id)
        })
        if (referenceIds.indexOf(card.card_id) !== -1) {
          whosePassive = short[i].card_name.english
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
        resolve(`${nameStyled} is ${mu.addArticle(`${s(rarity)}${s(color)}${s(manaStr)}${s(type)}${s(statsStr)}${s(setStr)}${text ? ': ' + text : ' and has no special text.'}${s(includesStr)}${s(illustratorStr)}${s(link)}`)}`)
        break

      case 'item':
        // cost nomana nostats
        resolve(`${nameStyled} is ${mu.addArticle(`${costStr}${s(rarity)} ${subType}${s(type)}${s(setStr)}${text ? ': ' + text : ' with no special text?'}${s(includesStr)}${s(illustratorStr)}${s(link)}`)}`)
        break

      case 'ability':
      case 'passive ability':
        // nostats nocolor
        resolve(`${nameStyled} is ${mu.addArticle(`${s(rarity)}${s(manaStr)}${s(type)}${s(setStr)}${text ? ': ' + text : ' with no special text.'}${s(includesStr)}${s(illustratorStr)}${s(link)}`)}`)
        break

      case 'improvement':
      case 'spell':
        // nostats
        resolve(`${nameStyled} is ${mu.addArticle(`${s(rarity)}${s(color)}${s(manaStr)}${s(type)}${s(setStr)}${text ? ': ' + text : ' with no special text.'}${s(includesStr)}${s(illustratorStr)}${s(link)}`)}`)
        break

      case 'stronghold':
      case 'pathing': // why not
        resolve(`${nameStyled} is ${mu.addArticle(`${s(rarity)}${s(color)}${s(manaStr)}${s(type)}${s(statsStr)}${s(setStr)}${text ? ': ' + text : ' with no special text.'}${s(includesStr)}${s(illustratorStr)}${s(link)}`)}`)
        // console.log(`* [${channel}] Unknown Artifact card type:${s(type)}`)
        break

      default:

        resolve(`${nameStyled} is ${mu.addArticle(`${s(rarity)}${s(color)}${s(manaStr)}${s(type)}${s(statsStr)}${s(setStr)}${text ? ': ' + text : ' and has no special text.'}${s(includesStr)}${s(illustratorStr)}${s(link)}`)}`)
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

module.exports.help = (params) => {
  return new Promise((resolve, reject) => {
    resolve(`Get info about an Artifact card: ${params[1]} <card...>`)
  })
}
