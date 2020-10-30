'use strict';

var config = require('config');
var player = require('./player');
var audiolib = require('./audiolib');
var playlist = require('./playlist');
var soundbit = require('./soundbit');
var eventEmitter = require('events').EventEmitter;

var usersWantNext = [];
var usersWantVeto = [];

var nextTimoutVar = undefined;
var nextDelay = config.get('nextDelay');

var controller = Object.create(new eventEmitter());

var currentTime = 0;

player.on('status', (stat) => {
	//only send the status update if we are not playing a soundbit
	// so the clients don't see irrelevant update (eg. volume, duration, current, ...)
	if(!soundbit.state.isActive) {
		controller.emit('statuschange');
	}
});
player.on('timeposition', (t) => {
	if(!soundbit.state.isActive) {
		currentTime = t;
		if (t < 3) { // notify a time change when we're in the first seconds of the song
			controller.emit('statuschange');			
		}
	}	
});

player.on('stopped', () => {
	console.log('stopped');

	if(!soundbit.state.isActive) {
		//clear the arrays for the next song so users can vote again
		usersWantNext = [];
		usersWantVeto = [];
		controller.emit('votechange');
		
		// if no sound bit was playing then the song ended
		if (nextTimoutVar) {
			// if we were going to next we clear it
			clearTimeout(nextTimoutVar);
			nextTimoutVar = undefined;
		}
		// and we'll hop along our playlist
		playlist.progress();
		currentTime = 0; // reset time
	}
});

function next(fp) {
	if(!fp || usersWantNext.includes(fp)) {
		return;
	}
	
	// when a user voted veto but changed his mind, then remove his veto vote
	var i = usersWantVeto.indexOf(fp);
	if(i > -1) {
		usersWantVeto.splice(i, 1);
	}
	
	usersWantNext.push(fp);
	//emit next veto change
	controller.emit('votechange');

	// if we don't have a next queued and we have more next than veto then we'll queue a next
	if(nextTimoutVar === undefined && usersWantNext.length > usersWantVeto.length) {
		soundbit.play('next.mp3');
		nextTimoutVar = setTimeout(() => {
			nextTimoutVar = undefined;
			player.stop();  // this will cause the stop callback to trigger and start the next song
		}, nextDelay);
	}
}
function veto(fp) {
	if(!fp || usersWantVeto.includes(fp)) {
		return;
	}
	
	// when a user voted next but changed his mind, then remove his next vote
	var i = usersWantNext.indexOf(fp);
	if(i > -1) {
		usersWantNext.splice(i, 1);
	}
	
	usersWantVeto.push(fp);
	//emit next veto change
	controller.emit('votechange');
	
	// if a next is queued and we have more or equel vetoers as nexters then well cancel the next
	if(nextTimoutVar !== undefined && usersWantNext.length <= usersWantVeto.length) {
		soundbit.play('veto.mp3');
		clearTimeout(nextTimoutVar);
		nextTimoutVar = undefined;
	}
}

function removeVotes(fp) {
	// remove the veto vote
	var i = usersWantVeto.indexOf(fp);
	if(i > -1) {
		usersWantVeto.splice(i, 1);
	}

	// remove the next vote
	var i = usersWantNext.indexOf(fp);
	if(i > -1) {
		usersWantNext.splice(i, 1);
	}
}

// and then we can start playing music
async function init() {
	await player.start();
	await audiolib.init();
	await playlist.fill()
	
	// start the player
	await playlist.progress();
}

async function getStatus() {
	var duration = 0;
	var volume = 100;
	var paused = true;

	try {
		duration = await player.getDuration();
		volume = await player.getProperty('volume');
		paused = await player.isPaused();
	} catch(err) {
		// ignore any errors from retrieving status
	}

	return {
		duration: duration,
		playing: !paused,
		volume: volume,
		time: currentTime,
		scanning: audiolib.scanning
	};
}

Object.assign(controller, {
	'init': init,
	'player': player,
	'audiolib': audiolib,
	'playlist': playlist,
	'soundbit': soundbit,
	'next': next,
	'veto': veto,
	'removeVotes': removeVotes,
	'getStatus': getStatus,
});

Object.defineProperty(controller, "votes", {
    get: function() {
		return {
			next: usersWantNext.length,
			veto: usersWantVeto.length
		};
	}
});

module.exports = controller;
