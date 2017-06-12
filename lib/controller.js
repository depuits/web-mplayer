'use strict';

var config = require('config');
var player = require('./player');
var playlist = require('./playlist');
var soundbit = require('./soundbit');
var eventEmitter = require('events').EventEmitter;

var nextTimoutVar = undefined;
var nextDelay = config.get('nextDelay');

var controller = Object.create(new eventEmitter());

player.on('statuschange', (stat) => {
	//only send the status update if we are not playing a soundbit
	// so the clients don't see irrelevant update (eg. volume, duration, current, ...)
	if(!soundbit.state.isActive) {
		//sendPlayerStatus();
		controller.emit('statuschange');
	}
});

player.on('stopped', () => {
	console.log('stopped');

	if(!soundbit.state.isActive) {
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

function next() {
	if(nextTimoutVar) {
		return;
	}
	soundbit.play('next.mp3');
	nextTimoutVar = setTimeout(() => {
		nextTimoutVar = undefined;
		player.stop();  // this will cause the stop callback to trigger and start the next song
	}, nextDelay);
}
function veto() {
	if(nextTimoutVar) {
		soundbit.play('veto.mp3');
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

function getStatus() {
	return {
		playing: !player.observed.pause,
		volume: player.observed.volume
	};
}

Object.assign(controller, {
	'init': init,
	'player': player,
	'next': next,
	'veto': veto,
	'soundbit': soundbit,
	'playlist': playlist
});

Object.defineProperty(controller, "status", {
    get: getStatus
});

module.exports = controller;
