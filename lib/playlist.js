'use strict';

var fs = require('fs');
var config = require('config');
var player = require('./player');
var audiolib = require('./audiolib');
var eventEmitter = require('events').EventEmitter;

var musicDir = config.get('musicDir');
var exts = config.get('extensions');
var playlistSize = config.get('playlistSize');

function hasExtension (f, exts) {	
	for(let e of exts) {
		if(f.endsWith (e)) {
			return true;
		}
	}
	
	return false;
}
function getRandomFile(dir, cb) {
	fs.readdir(dir, (err, files) => {
		if(err) {
			return cb(err);
		}
		var f = dir + '/' + files[Math.floor(Math.random()*files.length)];
		fs.stat(f, (err, stats) => {
			if(err) {
				return cb(err);
			}
			if(stats.isDirectory()) {
				getRandomFile(f, cb);
			} else {
				cb(null, f);
			}
		});
	});
}

var playlist = Object.create(new eventEmitter());

playlist.fill = function(cb) {
	this.playlist = this.playlist || [];
	
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
	
	this.current = this.playlist.shift();
	this.loadCurrent();
	this.fill();
};

playlist.loadCurrent = function() {
	console.log('play: ' + JSON.stringify(this.current))
	player.loadFile(this.current.path);
};

playlist.get = function() {
	return { 
		current: this.current, 
		requestlist: [], 
		playlist: this.playlist 
	}
};

module.exports = playlist;
