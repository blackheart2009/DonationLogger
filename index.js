/* Donation Logger
 * by Jim e
 * -------------------------------
 * Requires 
 *  - discord.js
 *  - request-promise
 */
/*jshint -W119 */
/*jshint -W104 */
/*jshint -W004 */
var discord          = require('discord.js');
var client           = new discord.Client();
var rp               = require('request-promise');
var config           = require('./config.js');
var memberDonateList = [];
var textChannels = [];
var timers = [];
var options = [];
var errorCount = 0;

var DEBUG = false;

var leagueStrings = [
    "<:Unranked:548118478800814081>",
    "<:B3Bdge:548119172849336360>", 
    "<:B2Bdge:548118970545209346>", 
    "<:B1Bdge:548118804882915357>", 
    "<:S3Bdge:548118617800310815>",
    "<:S2Bdge:548119354907295745>", 
    "<:S1Bdge:548118296214634529>", 
    "<:G3Bdge:548120984482480148>", 
    "<:G2Bdge:548133804368330752>", 
    "<:G1Bdge:548133960677326852>",
    "<:Crys3Bdge:548134141095444480>",
    "<:Crys2Bdge:548134288370040843>", 
    "<:Crys1Bdge:548134414681505803>", 
    "<:Mas3Bdge:548134567132004352>",
    "<:Mas2Bdge:548135141269176340>", 
    "<:Mas1Bdge:548135301105582080>", 
    "<:Ch3Bdge:548135477476065312>",
    "<:Ch2Bdge:548135591913455656>",
    "<:Ch1Bdge:548135760734191635>",
    "<:T3Bdge:548118137913212938>",
    "<:T2Bdge:548117961580478489>", 
    "<:T1Bdge:548117769175171082>", 
    "<:LgndBdge:548117561867239424>"
];

function debug( msg ) {
    if (DEBUG) console.log(msg);
}

function getLeagueFromID( id ) {
    if (id < 29000000) id = 29000000;
    if (id > 29000024) id = 29000024;
    return leagueStrings[id - 29000000];
}


//Timer function, Updates memberlist info and logs changes to discord and console
function timerUpdate( index ) {
    clearTimeout(timers[index]);
    rp(options[index])
    .then(clan => {
        var curDate = new Date();
        debug("Bot active at " + curDate.toLocaleTimeString());
        if (errorCount > 0) {
            debug("Bot is online.");
            errorCount = 0;
        }
        // Build donation message
        var donatedMsg = "";
        var receivedMsg = "";
        debug(" Clan size: " + clan.members);
        for (var i = 0; i < clan.members; i++) {
            var player = clan.memberList[i];
            if (player.tag in memberDonateList[index]) {
                var league = "";
                if (config.showLeague) league = getLeagueFromID(player.league.id)  + " " ;
                var diffDonations = player.donations - memberDonateList[index][player.tag].donations;
                if (diffDonations) {
                    donatedMsg += league + player.name + " (" + player.tag + ") : " + diffDonations + "\n";
                }
                var diffReceived = player.donationsReceived - memberDonateList[index][player.tag].donationsReceived;
                if (diffReceived) {
                    receivedMsg += league + player.name + " (" + player.tag + ") : " + diffReceived + "\n";
                }
            }
        }
        //Send Message if any donations exist
        if (donatedMsg!="" || receivedMsg!="") {
            if (config.useRichEmbed) {
                const embedObj = new discord.RichEmbed()
                    .setColor(config.clans[index].color)
                    .addField('Donated troops or spells:',donatedMsg, false)
                    .addField('Recieved troops or spells:', receivedMsg, false)
                    .setFooter(curDate.toUTCString());
                textChannels[index].send(embedObj);
            } else {
                textChannels[index].send(
                    '**Donated troops or spells:**\n' +
                    donatedMsg +
                    '**Recieved troops or spells:**\n' + 
                    receivedMsg + 
                    "*" + curDate.toUTCString() + "*\n\n");
            }
        }
        //Update member list data(purges members that have left)
        memberDonateList[index] = [];
        for (var i = 0; i < clan.members; i++) {
            var player = clan.memberList[i];
            memberDonateList[index][player.tag] = player;
        }
        //set timer again
        timers[index] = setTimeout(timerUpdate, config.timeDelay * 1000, index);
    })
    .catch(err => {
        textChannels[index].send("Something went wrong!!! \n ``` \n" + err.reason + " \n " + err.message + " \n ```");
        debug(err.message);
        errorCount++;
        if (errorCount > 30) {
            debug("Bot could not recover");
            errorCount = 30;
        }
        timers[index] = setTimeout(timerUpdate, config.timeDelay * 1000 * errorCount, index); // progressively lengthens
    });
}


client.on('ready', () => {
    debug("ready");
    errorCount = 0;
    timers = new Array(config.clans.length);
    textChannels = new Array(config.clans.length);
    options = new Array(config.clans.length);
    memberDonateList = new Array(config.clans.length);
    for(var i = 0; i < config.clans.length; i++ ) {
        debug(config.clans[i]);
        if (client.channels.has(config.clans[i].channelID)) {
            textChannels[i] = client.channels.get(config.clans[i].channelID);
            options[i] = {
                'uri': 'https://api.clashofclans.com/v1/clans/' + config.clans[i].tag.toUpperCase().replace(/O/g, '0').replace(/#/g, '%23'),
                'method': 'GET',
                'headers': {
                    'Accept': 'application/json',
                    'authorization': 'Bearer ' + config.apiKey,
                    'Cache-Control':'no-cache'
                },
                'proxy': process.env.FIXIE_URL,
                'json': true
            };
            debug(options[i].uri);
            memberDonateList[i] = [];
            textChannels[i].send("Logging Started!\n");
            timerUpdate(i);
        } else {
            debug("Error: Channel (" + config.clans[i].channelID + ") Not found!");
        }
    }
});

debug(config.discordToken);
client.login(config.discordToken);
