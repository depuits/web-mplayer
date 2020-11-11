'use strict';

var path = require('path');

var config = {
	port: 3003,
	playlistSize: 20,
	musicDir: '',
	blacklist: [],
	extensions: [ 
		'.aac',
		'.ac3',
		'.mp3',
		'.wav',
		'.wma',
		'.m4a',
		'.flac'
	],

	nextDelay: 10000,

	db: {
		url: 'mongodb://localhost:27017',
		name: 'musiclib',
	},

	soundBit: {
		dir: path.join(__dirname, '..', 'soundbits'),
		volume: 100,
		player: {
			options: { 
				audio_only: true,
				socket: '/tmp/node-mpv-soundbit.sock',
			},
			arguments: [],
		},
	},
	player: {
		options: { audio_only: true },
		arguments: [],
	},
	mpd: { port: 6600 }
};

module.exports = config;
