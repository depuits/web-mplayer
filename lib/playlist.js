'use strict';

var fs = require('fs');
var config = require('config');
var player = require('./player');
var audiolib = require('./audiolib');
var eventEmitter = require('events').EventEmitter;

var playlistSize = config.get('playlistSize');

var playlist = Object.create(new eventEmitter());

playlist.fill = function(cb) {
	this.playlist = this.playlist || [];
	this.requestlist = this.requestlist || [];
	
	var diff = playlistSize - this.playlist.length;
	if(diff > 0) {
		audiolib.random(diff, (err, items) => {
			this.playlist = this.playlist.concat(items);
			if(cb) {
				cb(this);
			}
			this.emit('updated', this);
		});
	} else if(cb) {
		cb(this);
	}
};
playlist.progress = function() {
	if(this.playlist === undefined) {
		console.log('Playlist progress called before the playlist was filed.');
		return;
	}
	
	if(this.requestlist.length > 0) {
		this.current = this.requestlist.shift();
	} else {
		this.current = this.playlist.shift();
	}
	
	this.loadCurrent();
	this.fill();
};

playlist.loadCurrent = function() {
	console.log('play: ' + JSON.stringify(this.current))
	player.loadFile(this.current.absPath);
};

playlist.request = function(id) {
	audiolib.get(id, (err, item) => {
		if(err) {
			console.log(err);
		} else if (item) {
			// only add the result if whe actually have an item
			this.requestlist.push(items);
			this.emit('updated', this);
		}
	});
};

playlist.get = function() {
	return { 
		current: this.current, 
		requestlist: this.requestlist, 
		playlist: this.playlist 
	}
};

module.exports = playlist;
