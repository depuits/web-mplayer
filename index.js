'use strict';

var config = require('config');
var express = require('express');
var bodyParser = require("body-parser");

var ctrl = require('./lib/controller');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var port = config.get('port');
var clients = new Map();

ctrl.on('statuschange', (stat) => {
	sendPlayerStatus();
});
ctrl.on('votechange', (stat) => {
	sendVoteStatus();
});
ctrl.playlist.on('updated', () => {
	sendPlaylistUpdate();
});

function handleCommand(data) {
	console.log('fp: ' + data.fp);
	
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
			ctrl.next(data.fp);
			break;
		case 'veto':
			ctrl.veto(data.fp);
			break;
		case 'volume':
			ctrl.player.volume(data.value);
			break;
		case 'playBit':
			ctrl.soundbit.play(data.file);
			break;
	}
}

function sendPlayerStatus(socket) {
	socket = socket || io;
	socket.emit('status', ctrl.status);
}
function sendVoteStatus(socket) {
	var data = ctrl.votes;
	data.all = clients.size;
	socket = socket || io;
	socket.emit('votes', data);
}
function sendPlaylistUpdate(socket) {
	socket = socket || io;
	//TODO we should filter the playlist to not send the complete file path
	socket.emit('playlist', ctrl.playlist.get());
}

app.use(bodyParser.json());
app.use(express.static("public"));

app.get('/playlist', function(req, res, next){
	res.status(200).json(ctrl.playlist.get());
});
app.post('/cmd', function(req, res, next){
	console.log('received request');
	req.body.fp = req.ip;
	handleCommand (req.body);
	res.redirect('/');
});
app.get('/:cmd', function(req, res, next){
	handleCommand ({ cmd: req.params.cmd, fp: req.ip });
	res.redirect('/');
});

io.on('connection', function (socket) {
	var fp = /*socket.handshake.query.fp; //*/socket.request.connection.remoteAddress;
	// if this client does not already have another socket open then its a new one
	// clients using the rest api are not counted towards active clients
	var clSockets = clients.get(fp);
	if(clSockets === undefined) {
		clSockets = [];
		clients.set(fp, clSockets);
		console.log('client connected: ' + fp);
		sendVoteStatus();
	}
	
	clSockets.push(socket);
	
	sendPlaylistUpdate(socket);
	sendPlayerStatus(socket);
	sendVoteStatus(socket);
	socket.on('command', (data) => {
		data.fp = fp;
		handleCommand (data);
	});
	socket.on('disconnect', () => {
		var index = clSockets.indexOf(socket);
		if (index > -1) {
			clSockets.splice(index, 1);
		}
		
		// if this is the last socket of this client then the client disconnected
		if(clSockets.length === 0) {
			clients.delete(fp);
			console.log('client disconnected: ' + fp);
			sendVoteStatus();
		}
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
