'use strict';
const mpd = require('mpd-server');
const ctrl = require('./controller');

module.exports = function(config) {
	function handleCommand(cmd, params) {
		console.log(`command received: ${cmd} args: ${params.join(', ')}`);
		let resp = '';
		switch (cmd) {
			case 'listplaylistinfo':
				// same as current playlist because we only support one
			case 'playlistinfo':
				//todo parameters
				//return artist: name
				resp = `artist: ${ctrl.playlist.current.artist}\ntitle: ${ctrl.playlist.current.title}\nfile: ${ctrl.playlist.current.path}\n`
				for (let s of ctrl.playlist.playlist) {
					resp += `artist: ${s.artist}\ntitle: ${s.title}\nfile: ${s.path}\n`;
				}
				break;
			case 'status':
			resp = 
`volume: ${ctrl.status.volume}
repeat: 0
random: 0
single: 0
consume: 1
playlist: 0
playlistlenght: ${ctrl.playlist.playlist.length}
state: ${ctrl.status.playing ? 'play' : 'pause'}
song: 0
songid: 0
nextsong: 1
nexsongid: 1
time: ${Math.round(ctrl.status.time)}
elapsed: ${ctrl.status.time}
duration: ${ctrl.status.duration}
bitrate: 128
audio: 44100:16:2
`;
			break;
		case 'tagtypes':
			resp = 'tagtype: Artist\ntagtype: Title\n';
			break;
		case 'outputs':
			resp = 
`outputid: 0
outputname: default
outputenabled: 0
`;
			break;
		case 'listplaylists':
			resp = 'playlist: default\nLast-Modified: 2016-07-22T00:00:00Z\n';
			break;
		case 'lsinfo':
			//if lsinfo is given a path parameter the output should actually be a path
			break;
		}

		return Promise.resolve(resp);
	}

	const server = mpd(handleCommand);

	server.listen(config, () => {
		console.log('mpd running on ', server.server.address());
	});

	server.on('error', (err, s) => { console.log(err); });
	
	// register sytem updates
	ctrl.on('statuschange', (stat) => {
		server.systemUpdate('player');
		server.systemUpdate('mixer');
	});
	ctrl.playlist.on('updated', () => {
		server.systemUpdate('playlist');
	});

	return server;
};
