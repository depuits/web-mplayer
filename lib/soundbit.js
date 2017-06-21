'use strict';

var fs = require('fs');
var path = require('path');
var config = require('config');
var player = require('./player');
var playlist = require('./playlist');

var soundBitDir = config.get('soundBitDir');
var soundBitVolume = config.get('soundBitVolume');

var state = {
	isActive: false,
	isStarted: false,
	wasPaused: false,
	prevVolume: 0,
	prevTime: 0
};

player.on('started', () => {
	console.log('started: sb - ' + state.isActive);
	if(state.isActive) {
		if(state.isStarted) {
			// the sound bit was started so this must be the song that continues
			player.goToPosition(state.prevTime);
			player.volume(state.prevVolume);
			state.isActive = false;
			if(state.wasPaused) {
				player.pause();
			}
		} else {
			// the sound bit isn't started yet so make sure it plays
			player.play();
			state.isStarted = true;
		}
	}
});

player.on('stopped', () => {
	console.log('stopped: sb - ' + state.isActive);

	if(state.isActive) {
		console.log('resuming play');
		// when the soundbit stopped, we resume the original song
		playlist.loadCurrent();
	}
});


function play(bit) {
	// we can't play 2 bits at once
	if(state.isActive) {
		return;
	}
	
	console.log('play bit: ' + bit);
	var file = path.join(soundBitDir, bit);
	
	//check if the file exists
	fs.access(file, fs.constants.R_OK, (err) => {
		if(err) {
			console.log('Can\'t read soundbit.');
		} else {		
			player.getProperty('time-pos').then(function(t) {
				state.isActive = true;
				state.isStarted = false;
				state.wasPaused = player.observed.pause
				state.prevVolume = player.observed.volume;
				state.prevTime = t;
				console.log('will continue playing at ' + t);
				player.loadFile(file);
				player.volume(soundBitVolume);
			});
		}
	});
}

module.exports = {
	'state': state,
	'play': play,
	'dir': soundBitDir
};
