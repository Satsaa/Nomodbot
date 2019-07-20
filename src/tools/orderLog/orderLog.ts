
import fs from 'fs'

const input = ''
const output = ''

const lines = fs.readFileSync(input, 'utf8').split('\n')

console.log('sorting')

let count = 0
lines.sort(sorter)

function sorter(lineA: string, lineB: string) {
  count++

  const timeA = ~~lineA.slice(0, lineA.indexOf(':')) || 9999999999999 // Have invalid lines go up
  const timeB = ~~lineB.slice(0, lineB.indexOf(':')) || 9999999999999 // Have invalid lines go up

  return timeA - timeB
}

console.log(`${count} comparisons`)
fs.writeFileSync(output, lines.join('\n'))
console.log('finish')
