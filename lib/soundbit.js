'use strict';
var fs = require('fs');
var path = require('path');
var Promise = require("bluebird");

var config = require('config').get('soundBit');

var mpv = require('node-mpv');
var player = new mpv(config.player.options, config.player.arguments);

Promise.promisifyAll(fs);

async function init() {
	await player.start();
	player.volume(config.volume);
}
async function play(bit) {
	let file = bit;
	try {
		// we only check if a http(s) link is given to a file
		if (!file.match(/^https?:\/\/.+/i)) {
			// only join and check the file if its not a link
			file = path.join(config.dir, bit);

			//check if the file exists
			await fs.accessAsync(file, fs.constants.R_OK);
		}

		console.log('play bit: ' + file);
		await player.load(file);
	}
	catch (err) {
		console.log('Can\'t read soundbit.');
	}
}

function list(dir) {
	dir = dir || config.dir;
	
	return fs.readdirAsync(dir).map((f) => {
		let file = path.join(dir, f);
		return fs.statAsync(file).then((stats) => {
			if(stats.isDirectory()) {
				return list(file).then((items) => {
					return {
						name: path.parse(f).name,
						value: items
					};
				});
			} else {
				return {
					name: path.parse(f).name,
					value: file.substring(config.dir.length)
				};
			}
		});
	});
}

module.exports = {
	'init': init,
	'player': player,
	'play': play,
	'list': list,
};
