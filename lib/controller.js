'use strict';

var config = require('config');
var player = require('./player');
var playlist = require('./playlist');
var soundbit = require('./soundbit');
var eventEmitter = require('events').EventEmitter;

var usersWantNext = [];
var usersWantVeto = [];

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
	
	// when a user voted next but changed his mind, then remove his veto vote
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
Object.defineProperty(controller, "votes", {
    get: function() {
		return {
			next: usersWantNext.length,
			veto: usersWantVeto.length
		};
	}
});

module.exports = controller;
