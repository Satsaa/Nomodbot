import { Extra, PluginInstance, PluginOptions, Userlvl } from '../../main/commander'
import PluginLibrary from '../../main/pluginLib'

import { ListsExtension } from './lists'

export const options: PluginOptions = {
  type: 'command',
  id: 'manlyquote',
  title: 'ManlyQuote',
  description: 'Spreads some manliness',
  default: {
    alias: '?manlyquote',
    options: {
      cooldown: 30,
      userCooldown: 60,
    },
  },
  help: [
    'Show a random or specific manly quote: {alias} [<INDEX>]',
    'Add a new manly quote: {alias} add <quote...>',
    'Edit a manly quote at index: {alias} edit <INDEX> <quote...>',
    'Insert a new manly quote at index: {alias} insert <INDEX> <quote...>',
    'Delete a manly quote at index: {alias} del <INDEX>',
  ],
  requirePlugins: ['lists'],
  disableMention: true,
  whisperOnCd: true,
}

export class Instance implements PluginInstance {
  public handlers: PluginInstance['handlers']
  private l: PluginLibrary
  private lists: ListsExtension

  constructor(pluginLib: PluginLibrary) {
    this.l = pluginLib
    this.lists = this.l.ext.lists as ListsExtension

    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'add <quote...>', this.callAdd)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'edit <INDEX> <quote...>', this.callEdit)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'insert <INDEX> <quote...>', this.callInsert)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', 'del <INDEX>', this.callDelete)
    this.handlers = this.l.addHandlers(this, this.handlers, 'default', '[<INDEX>]', this.callMain, this.callMain)
  }

  public async callAdd(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, quote]: ['add', string[]] = params

    const quotes = this.lists.getGlobalList<string>(options.id, defaultQuotes)
    if (!quotes) return 'Manlyquote data unavailable'
    if (!this.l.isPermitted({ userlvl: Userlvl.master }, userId, extra.irc.tags.badges)) return 'You are not permitted to edit manly quotes'

    const [finalIndex] = quotes.pushEntry(quote.join(' '))
    if (finalIndex) return `Added new entry at index ${finalIndex}`
    else return 'Something went horribly wrong!'
  }

  public async callEdit(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, index, quote]: ['edit', number, string[]] = params

    const quotes = this.lists.getGlobalList<string>(options.id, defaultQuotes)
    if (!quotes) return 'Manlyquote data unavailable'
    if (!this.l.isPermitted({ userlvl: Userlvl.master }, userId, extra.irc.tags.badges)) return 'You are not permitted to edit manly quotes'

    const [finalIndex] = quotes.setEntry(index, quote.join(' '))
    if (index) return `Modified entry at index ${finalIndex}`
    else return 'Invalid index'
  }

  public async callInsert(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, index, quote]: ['insert', number, string[]] = params

    const quotes = this.lists.getGlobalList<string>(options.id, defaultQuotes)
    if (!quotes) return 'Manlyquote data unavailable'
    if (!this.l.isPermitted({ userlvl: Userlvl.master }, userId, extra.irc.tags.badges)) return 'You are not permitted to edit manly quotes'

    const [finalIndex] = quotes.insertEntry(index, quote.join(' '))
    if (finalIndex) return `Added new entry at index ${finalIndex}`
    else return 'Invalid index'
  }

  public async callDelete(channelId: number, userId: number, params: any, extra: Extra) {
    const [action, index]: ['del', number] = params

    const quotes = this.lists.getGlobalList<string>(options.id, defaultQuotes)
    if (!quotes) return 'Manlyquote data unavailable'
    if (!this.l.isPermitted({ userlvl: Userlvl.master }, userId, extra.irc.tags.badges)) return 'You are not permitted to edit manly quotes'

    const [finalIndex, value] = quotes.delEntry(index)
    if (finalIndex) return `Deleted at ${finalIndex}: ${value}`
    else return 'Invalid index'
  }


  public async callMain(channelId: number, userId: number, params: any, extra: Extra) {
    const [index]: [number | undefined] = params

    const quotes = this.lists.getGlobalList<string>(options.id, defaultQuotes)
    if (!quotes) return 'Manlyquote data unavailable'
    if (!quotes.entries.length) return 'There are no manly quotes'

    const [finalIndex, value] = index ? quotes.getEntry(index) : quotes.randomEntry()
    if (finalIndex) return `${finalIndex}: ${value}`
    else return 'Something went horribly wrong!'
  }
}

// tslint:disable: max-line-length
const defaultQuotes = [
  '"I think you\'ve got the wrong door, the leather club\'s two blocks down."',
  '"Fuck you leather man."',
  '"Get out of that uh, jabroni outfit."',
  '"Let\'s go! Why don\'t you get out of that leather stuff? I\'ll strip down out of this and we\'ll settle it right here in the ring. What do you say?"',
  '"Take it boy!"',
  '"Swallow my cum."',
  '"Stick your finger in my ass!"',
  '"Fucking slaves.. Get your ass back here!"',
  '"Im an artist. Im a performance artist."',
  '"A a a aa aAH AAAAH"',
  '"It\'s a bondage gay website. All male."',
  '"You know I don\'t do anal."',
  '"Fisting is 300 bucks."',
  '"Do you like what you see?"',
  '"Without further interruption, let\'s celebrate and suck some dick!"',
  '"Oh shit im sorry."',
  '"Sometimes I pull it so hard, I rip the skin."',
  '"Our daddy told us not to be ashamed of our dicks."',
  '"It gets bigger when i pull em."',
  '"Hey buddy, I think you got the wrong door. The leather club is 2 blocks down."',
  '"Ah. Fuck you leather man!"',
  '*Whip sounds* "Cmon, lets go!"',
  '"I\'ll show you who\'s the boss of this gym!"',
  '"Huh? What do you wanna do? Let\'s do what you wanna do? You think you can beat me 1 2 3?"',
  '"I\'ll rip my fucking hands!"',
  '"Huh? You like that?"',
  '"What the hell are you two doing?"',
  '"The other night, when one of the other boys was sleeping. And I, uh, reached out and played with his dick."',
  '"That\'s power son, that\'s power!"',
  '*Slap* "AAAAaaahhh!"',
  '"Okay, maggots. I wanna see 6 hot loads on your GI\'s hat now!"',
  '"My fellow brothers, I, Billy Herrington, stand here today, humbled by the task before us, mindful of the sacrifices borne by our Nico Nico ancestors."',
  '"We are in the midst of a crisis. Nico Nico Douga is at war against a far-reaching storm of disturbance and deletion. Nico Nico\'s economy is badly weakened: a consequence of carelessness and irresponsibility on the part of acknowledgement, but also on the collective failure to make hard choices and to prepare for a new, MAD age."',
  '"Today, I say to you, that the challenges are real, and they are many. They will not be easily met, or in a short span of time, but know this, Nico Nico: they will be met. In reaffirming the greatness of our site, we understand that greatness is never given, our journey has never been one of shortcuts."',
  '"It has not been for the faint-hearted, or who seek the fleshly pleasures. Rather, it has been the risk-takers, the wasted genii, the creators of MAD things. For us, they toiled in sweatshops, endured the lash of the spanking. Time and again, these men struggled, and sacrificed, so that we might ... LIVE BETTER."',
  '"We remain the most powerful site on the Internet, our minds no less inventive, and services no less needed than they were last week, or yesterday, or the day before the day after tomorrow. Starting today, we must pull up our pants, dust ourselves off, and begin again the work of remaking Nico Nico Douga."',
  '"Now, there are some who question the scale of our ambitions, who suggest our server system cannot tolerate too many movies. Their memories are short, for they have forgotten what Nico Nico already has done, what free men can achieve when imagination is joined to common purpose."',
  '"And so, to all the people who are watching this video, from the grandest cities, to the small villages where IKZO was born, know that Nico Nico is a friend to every man who seeks a future of love and peace. Now we will begin, to responsibly leave authorized common materials to Nico Nico people, and forge a hard-earned peace in this MAD world."',
  '"What is required of us now is a new era of responsibility. This is the price, and the promise, of Nico NiCommons citizenship. Nico Nico Douga, in the face of common dangers, in this winter of our hardship, let us remember these timeless words: ASS, WE CAN."',
  '"Let it be said by our children\'s children, that when we were tested by DOS attacks, when we were refused by YouTube, that we did not turn back, nor did we falter, and we carried forth that great gift of freedom be delivered, and safely to future generations."',
  '"Thank you. God bless, and God bless Nico Nico Douga."',
  '"I got brains enough for the both of us, so lets uh, bet your ass.',
  '"I want you to jerk off. And i\'ll watch while you do it."',
  '"Ahh, my shoulder!"',
  '"Huh?! You like embarrassing me, huh?"',
  '"Endure the lash of the spanking!"',
  '"Hey, dont look surprised! Haven\'t seen two gay men kissing before?"',
  '"The semen arsonist."',
  '"AAAAAAAAAAAAAAAaaaaaaaaaaaaaaaaaahhhhhhhhHHHHHHH"',
  '"My name is Van. I\'m 30 years old, and im from Japan. I\'m an artist, I\'m a performance artist."',
  '"I\'m hired for people to fulfill their fantasies, their deep dark fantasies."',
  '"After a hundred or 2 auditions and small parts. You know I decided, I\'ve had enough. Then I got into escort work."',
  '"The clients requested alot, uhm, fetishes. So, I just decided to go full master and change my whole, entire house into a dungeon. Um, dungeon master."',
  '"Now with a full dungeon in my house and it\'s going really well. Fisting is 300 bucks."',
  '"Usually the guy gets high on pop, to really get relaxed, and I have this long latex glove that goes all the way up to my armpit. Then I put on a surgical latex glove up to my wrist. Just lube it up. It\'s a long process to get your whole arm up there."',
  '"But its an intense feeling for the other person, I think for myself too. You go to places that even though it\'s physical with your hand, for some reason it\'s also more emotional. It\'s more psychological too. We both reach the same place, it\'s really strange at the same time."',
  '"Hey its Mark from seriousmalebondage.com and today we are at the kink.com facilities"',
  '"Oh hoh ohh. Ganging up!"',
  '"Bondage... Gay website?"',
  '"I don’t see you all as fans, rather I embrace you all like friends. We’re all stars. Love you all"',
  '"You wanna get on bottom? You know that\'s where you wanna be."',
  '"Suction!"',
  '"I\'m hired by people to fulfill their fantasies ... their deep, dark fantasies."',
  '"Hands up, hands up!"',
  '"ん”ん”ん”ん”ん”ん”ん”(肯定)"',
  '"Come on, college boy!"',
]
