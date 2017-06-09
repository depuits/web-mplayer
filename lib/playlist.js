'use strict';

var fs = require('fs');
var config = require('config');
var player = require('./player');
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
	
	// check playlist lenght before starting anything to avoid flooding it
	if(this.playlist.length >= playlistSize) {
		if(cb) {
			cb(this);
		}
		this.emit('updated', this);
		return;
	}
		
	getRandomFile (musicDir, (err, f) => {
		if(err) {
			console.log('Error: ' + err);
		} else {
			var isValid = hasExtension(f, exts);
			if(isValid) {
				this.playlist.push(f);
			} else {
				console.log('skipping: ' + f)
			}
		}
		
		// keep doing this ti'll the playlist has reach its count
		this.fill (cb);
	});
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
	console.log('play: ' + this.current)
	player.loadFile(this.current);
};

playlist.get = function() {
	return { 
		current: this.current, 
		requestlist: [], 
		playlist: this.playlist 
	}
};

module.exports = playlist;
