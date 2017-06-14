'use strict';

var fs = require('fs');
var path = require('path');
var config = require('config');
var mongo = require('./mongo');
var mm = require('music-metadata');

var musicDir = config.get('musicDir');
var exts = config.get('extensions');

function hasExtension (f) {	
	for(let e of exts) {
		if(f.endsWith (e)) {
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
			let file = path.join(dir, f);
			fs.stat(file, (err, stats) => {
				if(err) {
					return cb(err);
				}
				if(stats.isDirectory()) {
					scanFolder(file, cb);
				} else if(hasExtension(file)) {
					cb(null, file);
				}
			});
		}
	});
}

var audiolib = {
	update: function() {
		var songsCol = mongo.db.collection('songs');
		songsCol.createIndex({title:"text", artist:"text"});
		//scan folder and add al new songs
		scanFolder(musicDir, (err, f) => { 
			if(err) {
				console.error(err);
			} else {
				//check if item is in the db
				songsCol.findOne({path:f}, (err, item) => {
					if(err) {
						console.log(err);
					} else if(!item) {
						//when the item was not found and no error
						// try to get the mp3 tags
						var stream = fs.createReadStream(f);
						mm.parseStream(stream, function (err, metadata) {
							// important note, the stream is not closed by default. To prevent leaks, you must close it yourself 
							stream.close();
							var song = { path: f };
							if(err) {
								console.log('failed to get tags: ' + f);
								console.log(err.message);
								song.title = path.parse(f).name;
							} else {
								song.title = metadata.common.title;
								song.artist = metadata.common.artist;
							}
							// and add it to the database
							songsCol.insert(song);
						});
					}
				});
			}
		});
	},
	get: function(count, cb) {
		count = count || 1;
		if(typeof count === 'function') {
			cb = count;
			count = 1;
		}
		var songsCol = mongo.db.collection('songs');
		songsCol.aggregate({ $sample: { size: +count } }, cb);
	},
	find: function(query, cb) {
		var songsCol = mongo.db.collection('songs');
		songsCol.find({"$text":{"$search": query}}).toArray(cb);
	}
};

module.exports = audiolib;
