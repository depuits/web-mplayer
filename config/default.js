var path = require('path');

var config = {
	port: 3003,
	musicDir: 'D:/data/music',
	extensions: [ 
		'.aac',
		'.ac3',
		'.mp3',
		'.wav',
		'.wma',
		'.m4a',
		'.flac'
	],
	db: 'mongodb://localhost:27017/musiclib',
	soundBitDir: path.join(__dirname, '..', 'soundbits'),
	soundBitVolume: 100,
	playlistSize: 20,
	nextDelay: 10000
};

module.exports = config;
