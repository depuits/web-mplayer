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
	switch(data.cmd.toLowerCase()) {
		case 'toggleplay':
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
		case 'playbit':
			ctrl.soundbit.play(data.file);
			break;
		case 'request':
			ctrl.playlist.request(data.id);
			break;
		case 'scan':
			ctrl.audiolib.update();
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
	socket.emit('playlist', ctrl.playlist.get());
}

app.use(bodyParser.json());
app.use(express.static("public"));

app.get('/playlist', function(req, res, next){
	res.status(200).json(ctrl.playlist.get());
});
app.get('/find', function(req, res, next){
	handlePromiseReq(res, ctrl.audiolib.find(req.query.s));
});
app.get('/soundbits', function(req, res, next) {
	handlePromiseReq(res, ctrl.soundbit.list());
});

function handlePromiseReq(res, prom) {
	prom.then((result) => {
		res.status(200).json(result);
	}, (err) => {
		console.log(err);
		res.status(500).end();
	});
}

app.post('/cmd', function(req, res, next){
	req.body.fp = req.ip;
	handleCommand (req.body);
	res.redirect('/');
});
app.get('/:cmd', function(req, res, next){
	var data = Object.assign({}, req.query, { cmd: req.params.cmd, fp: req.ip });
	handleCommand (data);
	res.redirect('/');
});

io.on('connection', function (socket) {
	var fp = socket.request.connection.remoteAddress;
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
	
	// send the current player data to this socket
	sendPlaylistUpdate(socket);
	sendPlayerStatus(socket);
	sendVoteStatus(socket);
	
	// handle socket events
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

// start the player
ctrl.init();

exports.app = app;
exports.server = server;
exports.io = io;
