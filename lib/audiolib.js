'use strict';

var fs = require('fs');
var path = require('path');
var config = require('config');
var mongo = require('./mongo');
var mm = require('music-metadata');
var Promise = require('bluebird');

var ObjectId = require('mongodb').ObjectID;

var musicDir = config.get('musicDir');
var blacklist = config.get('blacklist');
var exts = config.get('extensions');

Promise.promisifyAll(fs);

function hasExtension (f) {	
	for(let e of exts) {
		if(f.endsWith (e)) {
			return true;
		}
	}
	return false;
}
async function scanFolder(dir, logPrefix) {
	logPrefix = logPrefix || '|';
	var rp = path.relative(musicDir, dir).replace('\\', '/'); // make path relative and make windows path like unix
	if(blacklist.includes(rp)) {
		console.log(logPrefix, 'skipping (bl):', rp);
		return [];
	}

	var files = await fs.readdirAsync(dir);
	var results = [];

	if (rp) {
		console.log(logPrefix, 'scanning:', rp, '-', files.length);
	}

	for (let i = 0; i < files.length; ++i) {
		let pref = logPrefix + '-';
		if (logPrefix == '|') {
			pref = i.toString().padStart(files.length.toString().length, 0) + '/' + files.length + ' ' + pref;
		}

		let f = files[i];
		let file = path.join(dir, f);
		var stats = await fs.statAsync(file);
		if(stats.isDirectory()) {
			let subList = await scanFolder(file, pref);
			results = Array.prototype.concat.apply(results, subList);
		} else if(hasExtension(file)) {
			console.log(pref, 'reading:', file);
			results.push(await addFile(file));
		}
	}

	return results;
}

async function addFile(f) {
	var p = f.substring(musicDir.length);
	var songsCol = mongo.db.collection('songs');

	var song = { path: p };
	//check if item is in the db
	try {
		var metadata = await mm.parseFile(f, { skipCovers: true });
		song.title = metadata.common.title;
		song.artist = metadata.common.artist;
	}
	catch (err) {
		console.error(logPrefix, 'failed to get tags:', err.message);
	}

	//when the title of the song was not filled in
	// then set the file name as title
	// this may happen because the tag parsing failed
	// or because the tags where not filed in
	if(!song.title) {
		song.title = path.parse(f).name;
	}

	// add or update it in the database
	return songsCol.findOneAndUpdate({ path: p }, { $set: song }, { upsert: true, returnNewDocument: true });
}

var audiolib = {
	init: function() {
		return mongo.connect();
	},

	update: function() {
		if(this.scanning) {
			return Promise.reject(new Error('Scanning already in progress.'));
		}
		
		console.log('scanning: ' + musicDir);
		this.scanning = true;
		
		//scan folder and add al new songs
		return Promise.resolve(scanFolder(musicDir)).finally(() => {
			console.log('scan complete');
			this.scanning = false;
		});
	},
	get: function(id) {
		var songsCol = mongo.db.collection('songs');
		return songsCol.findOne({ _id: ObjectId(id) });
	},
	random: function(count) {
		count = count || 1;

		var songsCol = mongo.db.collection('songs');
		return songsCol.aggregate([{ $sample: { size: +count } }]).toArray();
	},
	find: function(query) {
		var songsCol = mongo.db.collection('songs');
		//songsCol.find({"$text":{"$search": query}}).toArrayAsync();
		return songsCol.find({ $or: [
			{ path: { $regex: query, $options: 'i' }},
			{ title: { $regex: query, $options: 'i' }},
			{ artist: { $regex: query, $options: 'i' }}
		]}).toArray();
	}
};

module.exports = audiolib;
