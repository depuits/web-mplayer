'use strict';

var fs = require('fs');
var path = require('path');
var config = require('config');
var player = require('./player');
var audiolib = require('./audiolib');
var eventEmitter = require('events').EventEmitter;

var musicDir = config.get('musicDir');
var playlistSize = config.get('playlistSize');

var playlist = Object.create(new eventEmitter());

playlist.fill = function(cb) {
	this.playlist = this.playlist || [];
	this.requestlist = this.requestlist || [];
	
	var diff = playlistSize - this.playlist.length;
	if(diff > 0) {
		audiolib.random(diff).then((items) => {
			this.playlist = this.playlist.concat(items);
			if(cb) {
				cb(this);
			}
			this.emit('updated', this);
		}, console.log);
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
		//send playlist update when the request changes
	} else {
		this.current = this.playlist.shift();
	}

	this.emit('updated', this); // we emit an update directly after we go to the next song

	// another update will be emitted when the playlist had to be filled

	this.loadCurrent();
	this.fill();
};

playlist.loadCurrent = function() {
	console.log('play: ' + JSON.stringify(this.current));
	var file = path.join(musicDir, this.current.path);
	player.load(file);
};

playlist.request = function(id) {
	console.log('requesting: ' + id);
	var song = this.requestlist.find((s) => {
		return s._id == id;
	});
	if(song !== undefined) {
		console.log('song already requested');
		return;
	}
	
	audiolib.get(id).then((item) => {
		console.log(item);
		if (item) {
			// only add the result if whe actually have an item
			this.requestlist.push(item);
			this.emit('updated', this);
		}
	}, console.log);
};

playlist.get = function() {
	return { 
		current: this.current, 
		requestlist: this.requestlist, 
		playlist: this.playlist 
	}
};

module.exports = playlist;
