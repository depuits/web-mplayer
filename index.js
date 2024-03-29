'use strict';

let config = require('config');
let express = require('express');
let bodyParser = require("body-parser");

let ctrl = require('./lib/controller');

let port = config.get('port');
let app = express();
let server = require('http').Server(app);
let io = require('socket.io')(server);

let mpd = undefined;
let mpdConf = config.get('mpd');

let clients = new Map();

function connectClient(fp, socket) {	
	// if this client does not already have another socket open then its a new one
	// clients using the rest api are not counted towards active clients
	let clSockets = clients.get(fp);
	if(clSockets === undefined) {
		clSockets = [];
		clients.set(fp, clSockets);
		console.log('client connected: ' + fp);
		sendVoteStatus();
	}
	
	clSockets.push(socket);
}
function disconnectClient(fp, socket) {
	let clSockets = clients.get(fp);
	if (!clSockets) {
		return;
	}
	let index = clSockets.indexOf(socket);
	if (index > -1) {
		clSockets.splice(index, 1);
	}
	
	// if this is the last socket of this client then the client disconnected
	if(clSockets.length === 0) {
		clients.delete(fp);
		console.log('client disconnected: ' + fp);
		ctrl.removeVotes(fp);
		sendVoteStatus();
	}
}

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
			ctrl.audiolib.update().finally(() => {
				// send the player status if the scan ended
				sendPlayerStatus();
			}).catch((err) => {
				console.log('Error occured during scan:');
				console.log(err);
			});
			// send the player status when the scan started
			sendPlayerStatus();
			break;
	}
}

function sendPlayerStatus(socket) {
	socket = socket || io;
	ctrl.getStatus().then(status => {
		socket.emit('status', status);
	});
	//TODO something catch
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
	res.status(204).end();
});
app.get('/:cmd', function(req, res, next){
	var data = Object.assign({}, req.query, { cmd: req.params.cmd, fp: req.ip });
	handleCommand (data);
	res.redirect('/');
});

io.on('connection', function (socket) {
	var fp = socket.request.connection.remoteAddress;
	connectClient(fp, socket);
	
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
		disconnectClient(fp, socket);
	});
});

// start the player
ctrl.init().then(() => {
	//when the player is started, start up interfaces
	server.listen(port, () => {
		console.log('App listening on port ' + port);
	});

	if (mpdConf) {
		mpd = require('./lib/mpd')(mpdConf);
		mpd.on('connect', (con) => {
			connectClient(con.socket.address().address, con);
		});
		mpd.on('disconnect', (con) => {
			disconnectClient(con.socket.address().address, con);
		});
	}
}).catch((err) => {
	console.log(err);
	process.exit();
});

module.exports = {
	app,
	server,
	io,
	mpd,
	clients
}
