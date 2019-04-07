# Commands

## afk
!afk (message...)

Notify afk users with a custom message
- !afk marks a user as afk until they write again in chat
- Notify users that directly mention an afk user
- Like: *mentioner* *afkuser* is afk(: *message*)
- Should not notify if already done so recently (minimum lines between notifies? or time)
- Don't notify a user that already received a notify?

## circle
!circle [inner] [outer] (outerN...)

Shows a message that visually shows an emote surrounded by 6 other emotes
- *inner* and *outer* are expected to be emotes but may be text
- Emote only is possible but need ffz, bttv and subscriber emote data to allow those emotes
- If more than one *outer* emote is defined, switch between them in the order inputted
- Expects 1, 2, 3 or 6 outer emotes for symmetry
- If 4, 5 or >6 outer emotes are given, only use the first 3 or 6 emotes

## slots
!slots (bet)

Shows a message with 3 random emotes and gives points based on that
- Bad odds
- Point weight based on what emote (PogChamp high points, LUL low points etc.)
- No combo = ~ 0 x EmoteWeight x bet
- 2x same emote = ~ 0.5 x EmoteWeight x bet
- 3x same emote = ~ 10 x EmoteWeight x bet
- Subscriber emotes give extra points (rare) (requires subscription of bot)

## Category
!category

Shows current category duuh

# Plugins

## plugin.requires

## Plugin for creating custom options for commands

Plugin files can export an object that defined options (and their types)  
The export is to be named "options"? Rename current "options" export to "plugin"  
Actually name it "commandOptions"  
The "accepts" key might have a value like: `"string", "number", "positive", "boolean", (v) => boolean`
<pre>
{
  optionName: {
    info: "controls this and that",
    accepts: "number"
             (v) => {v !== 42}
  }
}
</pre>