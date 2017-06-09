'use strict';

var config = require('config');
var express = require('express');

var ctrl = require('lib/controller');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var port = config.get('port');

ctrl.player.on('statuschange', (stat) => {
	//only send the status update if we are not playing a soundbit
	// so the clients don't see irrelevant update (eg. volume, duration, current, ...)
	if(!soundBitInfo.isActive) {
		sendPlayerStatus();
	}
});

function handleCommand(data) {
	switch(data.cmd) {
		case 'togglePlay':
			ctrl.player.togglePause ();
			break;
		case 'play':
			ctrl.player.play ();
			break;
		case 'pause':
			ctrl.player.pause ();
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
			ctrl.playBit(data.file);
			break;
	}
}

function sendPlaylistUpdate(socket) {
	socket = socket || io;
	//TODO we should filter the playlist to not send the complete file path
	socket.emit('playlist', { 
		current: currentFile, 
		requestlist: requestlist, 
		playlist: playlist 
	});
}

function sendPlayerStatus(socket) {
	socket = socket || io;
	socket.emit('status', {
		playing: !ctrl.player.observed.pause,
		volume: ctrl.player.observed.volume
	});
}

app.use(express.static("public"));

app.get('/playlist', function(req, res, next){
	res.status(200).json(playlist);
});

app.get('/togglePlay', function(req, res, next){
	handleCommand ({ cmd: 'togglePlay' });
	res.redirect('/');
});
app.get('/play', function(req, res, next){
	handleCommand ({ cmd: 'play' });
	res.redirect('/');
});
app.get('/pause', function(req, res, next){
	handleCommand ({ cmd: 'pause' });
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
