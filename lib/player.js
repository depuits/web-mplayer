'use strict';

var os = require('os');
var mpv = require('node-mpv');
var playerOptions = { audio_only: true };//*/, debug: true };
// windows uses another socket string for mpv
if (os.platform() === 'win32') {
	playerOptions.socket = '\\\\.\\pipe\\mpvsocket';
}
var player = new mpv(playerOptions);
module.exports = player;
