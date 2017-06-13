'use strict';

var fs = require('fs');
var config = require('config');
var mongo = require('./mongo');

var musicDir = config.get('musicDir');
var exts = config.get('extensions');

function hasExtension () {	
	for(let e of exts) {
		if(this.endsWith (e)) {
			return true;
		}
	}
	
	return false;
}
function scanFolder(dir, cb) {
	fs.readdir(dir, (err, files) => {
		if(err) {
			return cb(err);
		}
		
		for(let f of files) {
			var file = dir + '/' + f;
			fs.stat(file, (err, stats) => {
				if(err) {
					cb(err);
					continue;
				}
				if(stats.isDirectory()) {
					scanFolder(file, cb);
				} else if(file.hasExtension()) {
					cb(null, file);
				}
			});
		}
	});
}

var audiolib = {
	update: function() {
		//scan folder and add al new songs
		scanFolder(musicDir, (err, f) => { console.log(f); });
	},
	getSongs: function(count, cb) {
		count = count || 1;
		if(typeof count === 'function') {
			cb = count;
			count = 1;
		}
		mongo.db.collection('songs').aggregate({ $sample: { size: count } }, cb);
	}
};

module.exports = audiolib;
