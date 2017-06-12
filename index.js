'use strict';

var config = require('config');
var express = require('express');

var ctrl = require('./lib/controller');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var port = config.get('port');

ctrl.on('statuschange', (stat) => {
	sendPlayerStatus();
});

ctrl.playlist.on('updated', () => {
	sendPlaylistUpdate();
});

function handleCommand(data) {
	switch(data.cmd) {
		case 'togglePlay':
			ctrl.player.togglePause();
			break;
		case 'play':
			ctrl.player.play();
			break;
		case 'pause':
			ctrl.player.pause();
			break;
		case 'next':
			ctrl.next();
			break;
		case 'veto':
			ctrl.veto();
			break;
		case 'volume':
			ctrl.player.volume(data.value);
			break;
		case 'playBit':
			ctrl.soundbit.play(data.file);
			break;
	}
}

function sendPlaylistUpdate(socket) {
	socket = socket || io;
	//TODO we should filter the playlist to not send the complete file path
	socket.emit('playlist', ctrl.playlist.get());
}

function sendPlayerStatus(socket) {
	socket = socket || io;
	socket.emit('status', ctrl.status);
}

app.use(express.static("public"));

app.get('/playlist', function(req, res, next){
	res.status(200).json(ctrl.playlist.get());
});

app.get('/:cmd', function(req, res, next){
	handleCommand ({ cmd: req.params.cmd }); //TODO replace witch cmd endpoint and parse body
	res.redirect('/');
});

io.on('connection', function (socket) {
	var fp = socket.handshake.query.fp;
	console.log('client connected: ' + fp);
	sendPlaylistUpdate(socket);
	sendPlayerStatus();
	socket.on('command', (data) => {
		data.fp = fp;
		handleCommand (data);
	});
});

// we first need to start up the web server
server.listen(port, () => {
	console.log('App listening on port ' + port);
});

ctrl.init();

exports.app = app;
exports.server = server;
exports.io = io;
