'use strict';

var config = require('config');
var player = require('./player');
var playlist = require('./playlist');

var nextTimoutVar = undefined;
var nextDelay = config.get('nextDelay');

var soundBitVolume = config.get('soundBitVolume');
var soundBitInfo = {
	isActive: false,
	isStarted: false,
	wasPaused: false,
	prevVolume: 0,
	prevTime: 0
};

playlist.on('updated', () => {
	console.log('Playlist filled');
});

player.on('statuschange', (stat) => {
	//only send the status update if we are not playing a soundbit
	// so the clients don't see irrelevant update (eg. volume, duration, current, ...)
	if(!soundBitInfo.isActive) {
		//sendPlayerStatus();
	}
});

player.on('started', () => {
	console.log('started: sb - ' + soundBitInfo.isActive);
	if(soundBitInfo.isActive) {
		if(soundBitInfo.isStarted) {
			// the sound bit was started so this must be the song that continues
			player.goToPosition(soundBitInfo.prevTime);
			player.volume(soundBitInfo.prevVolume);
			soundBitInfo.isActive = false;
			if(soundBitInfo.wasPaused) {
				player.pause();
			}
		} else {
			// the sound bit isn't started yet so make sure it plays
			player.play();
			soundBitInfo.isStarted = true;
		}
	}
});

player.on('stopped', () => {
	console.log('stopped: sb - ' + soundBitInfo.isActive);

	if(soundBitInfo.isActive) {
		console.log('resuming play');
		console.log('of: ' + playlist.current);

		// when the soundbit stopped, we resume the original song
		playlist.loadCurrent();
	} else {
		// if no sound bit was playing then the song ended
		if (nextTimoutVar) {
			// if we were going to next we clear it
			clearTimeout(nextTimoutVar);
			nextTimoutVar = undefined;
		}
		// and we'll hop along our playlist
		playlist.progress();
	}
});


function playBit(bit) {
	// we can't play 2 bits at once
	if(soundBitInfo.isActive) {
		return;
	}
	
	var file = __dirname + '/soundbits/' + bit;

	player.getProperty('time-pos').then(function(t) {
		soundBitInfo.isActive = true;
		soundBitInfo.isStarted = false;
		soundBitInfo.wasPaused = player.observed.pause
		soundBitInfo.prevVolume = player.observed.volume;
		soundBitInfo.prevTime = t;
		console.log('play bit: ' + file);
		console.log('will continue playing at ' + t);
		player.loadFile(file);
		player.volume(soundBitVolume);
	});
}

function next() {
	if(nextTimoutVar) {
		return;
	}
	playBit('next.mp3');
	nextTimoutVar = setTimeout(() => {
		nextTimoutVar = undefined;
		player.stop();  // this will cause the stop callback to trigger and start the next song
	}, nextDelay);
}
function veto() {
	if(nextTimoutVar) {
		playBit('veto.mp3');
		clearTimeout(nextTimoutVar);
		nextTimoutVar = undefined;
	}
}

// and then we can start playing music
function init() {
	playlist.fill((pl) => {
		playlist.progress();
	});
}

module.exports = {
	'init': init,
	'player': player,
	'next': next,
	'veto': veto,
	'playBit': playBit,
	'playlist': playlist
};
