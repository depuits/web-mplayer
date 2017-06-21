'use strict';

var fs = require('fs');
var path = require('path');
var config = require('config');
var mongo = require('./mongo');
var mm = require('music-metadata');
var Promise = require("bluebird");

var ObjectId = require('mongodb').ObjectID;

var musicDir = config.get('musicDir');
var exts = config.get('extensions');

Promise.promisifyAll(fs);
Promise.promisifyAll(mm);

function hasExtension (f) {	
	for(let e of exts) {
		if(f.endsWith (e)) {
			return true;
		}
	}
	return false;
}
function scanFolder(dir) {
	return fs.readdirAsync(dir).map((f) => {
		let file = path.join(dir, f);
		return fs.statAsync(file).then((stats) => {
			if(stats.isDirectory()) {
				return scanFolder(file);
			} else if(hasExtension(file)) {
				return addFile(file);
			}
		});
	}).then((results) => {
        // flatten the array of arrays
        return Array.prototype.concat.apply([], results);
	});
}

function addFile(f) {
	var p = f.substring(musicDir.length);
	var songsCol = mongo.db.collection('songs');
	//check if item is in the db
	return songsCol.findOneAsync({ path: p }).then((item) => {
		if(item) {
			return item;
		} else {
			//when the item was not found and no error
			// try to get the mp3 tags
			var stream = fs.createReadStream(f);
			return mm.parseStreamAsync(stream).then((metadata) => {
				return {
					path: p,
					title: metadata.common.title,
					artist: metadata.common.artist
				};
			}, (err) => {
				console.log('failed to get tags: ' + p);
				console.log(err.message);
				return {
					path: p
				};
			}).then((song) => {
				// important note, the stream is not closed by default. To prevent leaks, you must close it yourself 
				stream.close();
				
				//when the title of the song was not filled in
				// then set the file name as title
				// this may happen because the tag parsing failed
				// or because the tags where not filed in
				if(!song.title) {
					song.title = path.parse(f).name;
				}
				// and add it to the database
				songsCol.insert(song);
				return song;
			});
		}
	});
}

var audiolib = {
	update: function() {
		console.log('scanning: ' + musicDir);
		/*var songsCol = mongo.db.collection('songs');
		// create text index on all searchable properties
		songsCol.createIndex({
			title: 'text',
			artist: 'text',
			path: 'text',
		});*/
		
		//scan folder and add al new songs
		return scanFolder(musicDir).then((data) => {
			console.log('scan complete');
			return data;
		});
	},
	get: function(id) {
		var songsCol = mongo.db.collection('songs');
		return songsCol.findOneAsync({ _id: ObjectId(id) });
	},
	random: function(count) {
		count = count || 1;

		var songsCol = mongo.db.collection('songs');
		return songsCol.aggregateAsync({ $sample: { size: +count } });
	},
	find: function(query) {
		var songsCol = mongo.db.collection('songs');
		//songsCol.find({"$text":{"$search": query}}).toArrayAsync();
		return songsCol.find({ $or: [
			{ path: { $regex: query, $options: 'i' }},
			{ title: { $regex: query, $options: 'i' }},
			{ artist: { $regex: query, $options: 'i' }}
		]}).toArrayAsync();
	}
};

module.exports = audiolib;
