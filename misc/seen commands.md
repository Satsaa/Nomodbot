

v8debug.bot.client.join([17337557,40197643,51496027,106125347,71092938,69759951,26490481,132954738,44445592,153314610,136765278,112822444,192678094,7236692,21673391,156567621,14371185,31557869,35618666,23936415,57717183,23528098,20992865,76055616,137512364,45143025,18587270,205401621,91137296,10397006], 1500)


[When?]
CMD           desc
Necessary fields <Dynamic fields> (Interesting fields) - about so
...

[ONCONNECT]
001           Welcome message by server

CAP * ACK     Server acknowledges that you have requested capabilities
:(<twitch.tv/tags twitch.tv/commands twitch.tv/membership>)

003           Tells nuffing
002           Tells nuffing
004           Tells nuffing
375           Tells nuffing
376           Tells nuffing
372           Tells nuffing

GLOBALUSERSTATE
@<badges=;color=#008000;display-name=NoModBot;emote-sets=0;user-id=266132990;user-type=> GLOBALUSERSTATE

[ALWAYS]
PONG          Server response to PING
PING          Server PING

[ONCHANNEL]
JOIN          Someone joins a channel
:<redesu!redesu@redesu>.tmi.twitch.tv JOIN #<vadikus007>

PART          Someone leaves a channel
:<nomodbot!nomodbot@nomodbot>.tmi.twitch.tv PART #<vadikus007>

HOSTTARGET    The channel is hosting someone
HOSTTARGET #<vadikus007> :<infinitegachi> -
HOSTTARGET #<satsaa> :- 0

NOTICE        Notices havea a msg-id tag to tell what's their meaning
@<msg-id=host_on> NOTICE #<vadikus007> :Now hosting InfiniteGachi.
@<msg-id=host_off> NOTICE #<satsaa> :Exited host mode.
@<msg-id=msg_banned> NOTICE #<satsaa> :You are permanently banned from talking in satsaa.
@<msg-id=msg_duplicate> NOTICE #<satsaa> :Your message was not sent because it is identical to the previous one you sent, less than 30 seconds ago."
@<msg-id=msg_ratelimit> NOTICE #<satsaa> :Your message was not sent because you are sending messages too quickly.
@<msg-id=msg_rejected_mandatory> NOTICE #<satsaa> :Your message wasn't posted due to conflicts with the channel's moderation settings.

ROOMSTATE     Channels state was changed
@<broadcaster-lang=;emote-only=0;followers-only=0;r9k=0;rituals=0;room-id=72256775;slow=0;subs-only=0> ROOMSTATE #<vadikus007>

MODE          +o -o Someone lost or got mod
:(jtv) MODE #<zfg1> +o <swordlesslink>
:(jtv) MODE #<zfg1> -o <swordlesslink>

CLEARCHAT     User is timedout
@<ban-duration=600> CLEARCHAT #<sodapoppin> :<invalidus>
@ NO BAN DURATION = PERMABAN :tmi.twitch.tv CLEARCHAT #satsaa :<user>

CLEARMSG
@login=<prestodotexe>;<target-msg-id=8588ea5c-05d6-4cfb-8ab7-e6f70df98bec>; :tmi.twitch.tv CLEARMSG #<joshog> :YUM YUM YUM KRAAABER BABY

USERNOTICE    Subs, rituals and more
@...<login=peter>;msg-id=resub;msg-param-cumulative-months=6;msg-param-months=0;msg-param-should-share-streak=0;msg-param-sub-plan-name=Channel\sSubscription\s(sodapoppin);msg-param-sub-plan=Prime;... USERNOTICE #<sodapoppin>
@...<msg-id=resub>;<msg-param-cumulative-months=6>;<msg-param-months=0>;<msg-param-should-share-streak=1>;msg-param-streak-months=6;msg-param-sub-plan-name=Channel\sSubscription\s(meclipse);<msg-param-sub-plan=Prime> ... :Your A Legend.."
@...<msg-id=sub>;msg-param-cumulative-months=0;msg-param-months=0;<msg-param-should-share-streak=0>;msg-param-sub-plan-name=Channel\sSubscription\s(meclipse);<msg-param-sub-plan=1000>;...
@msg-id=resub;msg-param-cumulative-months=4;msg-param-months=0;msg-param-should-share-streak=1;msg-param-streak-months=4;msg-param-sub-plan-name=Channel\sSubscription\s(meclipse);msg-param-sub-plan=1000;...
@...msg-id=subgift;msg-param-months=0;msg-param-origin-id=da\s39\sa3\see\s5e\s6b\s4b\s0d\s32\s55\sbf\sef\s95\s60\s18\s90\saf\sd8\s07\s09;msg-param-recipient-display-name=FluffingtonTV;msg-param-recipient-id=70300918;msg-param-recipient-user-name=fluffingtontv;msg-param-sender-count=0;msg-param-sub-plan-name=Channel\sSubscription\s(meclipse);msg-param-sub-plan=1000;...
@display-name=AnAnonymousGifter;<login=ananonymousgifter>;<msg-id=subgift>;<msg-param-fun-string=FunStringFour>;<msg-param-months=20>;<sg-param-recipient-display-name=colt149>;<msg-param-recipient-user-name=colt149>;<msg-param-sub-plan-name=8=D>;system-msg=An\s<anonymous>\suser\sgifted\sa\sTier\s1\ssub\sto\scolt149!\s;
@badges=;color=#FF69B4;display-name=Satsaa;emotes=64138:0-8;flags=;id=3b314fa7-06af-4e14-bf07-bd58d686049a;login=satsaa;mod=0;msg-id=ritual;msg-param-ritual-name=new_chatter;room-id=116888929;subscriber=0;system-msg=@Satsaa\sis\snew\shere.\sSay\shello!;tmi-sent-ts=1552772151290;user-id=61365582;user-type= :tmi.twitch.tv USERNOTICE #ssaab :SeemsGood
^new chatter ritual

// !!!
display-name: 'woldxd',
id: '808028ee-cc59-4fb9-b619-59fcd23b2d95',
login: 'woldxd',
mod: '0',
msg-id: 'rewardgift',
msg-param-bits-amount: '500',
msg-param-domain: 'seasonal-pride',
msg-param-min-cheer-amount: '200',
msg-param-selected-count: '10',
system-msg: 'reward',
user-id: 441229134,
user-type: ''
},
params: [ '#l34um1', 'A Cheer shared Rewards to 10 others in Chat!']
}

PRIVMSG       Someone sends a message
@badge-info=;badges=;color=#DAA520;<display-name=千本桜景厳;>emotes=;flags=;id=4814d191-0003-4e83-beb9-a21deb4995fb;mod=0;room-id=22484632;subscriber=0;tmi-sent-ts=1555873627911;turbo=0;user-id=47054454;user-type= :<jarozy>!jarozy@jarozy.tmi.twitch.tv PRIVMSG #forsen :VAVE ZULUL

@userstate :<poiintxblank!poiintxblank@poiintxblank>.tmi.twitch.tv PRIVMSG #shroud :<@hunzerrr oh, yea it is>
@...<emotes=60364:0-6/997820:26-36/1723850:40-48>;<flags>=[50-101]:,50-101:,50-101:,[105-134]:,105-134:,105-134: :streamelements!streamelements@streamelements.tmi.twitch.tv PRIVMSG #shroud :shroudW Have you heard of shroudPrime ? shroudHyp https://clips.twitch.tv/FuriousPiercingBananaPJSugar - http://bit.ly/HowToTwitchPrime

WHISPER
@display-name=Satsaa;emotes=1:[0-1];user-type= :<satsaa!satsaa@satsaa>.tmi.twitch.tv WHISPER nomodbot :<message>

[ONJOIN]
JOIN          Someone (you here) joins a channel
:nomodbot!nomodbot@nomodbot.tmi.twitch.tv JOIN #<vadikus007>

353           Who are in the channel
353 nomodbot = #<vadikus007> :nomodbot

366           End of names list (353)
366 nomodbot #<vadikus007>


USERSTATE     Your channel specific userstate
@<badges=;color=#008000;display-name=NoModBot;emote-sets=0;mod=0;subscriber=0;user-type=> USERSTATE #<vadikus007>

[ONPART]
PART          Someone (you here) leaves a channel
:nomodbot!nomodbot@nomodbot.tmi.twitch.tv PART #<vadikus007>