'use strict';

var os = require('os');
var fs = require('fs');
var config = require('config');
var express = require("express");
var mpv = require('node-mpv');
var playerOptions = { audio_only: true };//*/, debug: true };
// windows uses another socket string for mpv
if (os.platform() === 'win32') {
	playerOptions.socket = '\\\\.\\pipe\\mpvsocket';
}
var player = new mpv(playerOptions);

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var port = config.get('port');
var musicDir = config.get('musicDir');
var exts = config.get('extensions');
var playlistSize = 20;
var playlist = [];
var requestlist = [];
var currentFile = '';

var nextTimoutVar = undefined;
var nextDelay = config.get('nextDelay');

var soundBitVolume = config.get('soundBitVolume');
var soundBitInfo = {
	isActive: false,
	isStarted: false,
	prevVolume: 0,
	prevTime: 0
};

player.on('statuschange', (stat) => {
	//only send the status update if we are not playing a soundbit
	// so the clients don't see irrelevant update (eg. volume, duration, current, ...)
	if(!soundBitInfo.isActive) {
		sendPlayerStatus();
	}
});

player.on('started', () => {
	console.log('started: sb - ' + soundBitInfo.isActive);
	if(soundBitInfo.isActive) {
		if (soundBitInfo.isStarted) {
			player.goToPosition(soundBitInfo.prevTime);
			soundBitInfo.isActive = false;	
		} else {
			soundBitInfo.isStarted = true;
		}
	}
});

player.on('stopped', () => {
	console.log('stopped: sb - ' + soundBitInfo.isActive);

	if(soundBitInfo.isActive) {
		console.log('resuming play');
		console.log('of: ' + currentFile);
		console.log(soundBitInfo);

		player.loadFile(currentFile);
		player.volume(soundBitInfo.prevVolume);
	} else {
		if (nextTimoutVar) {
			clearTimeout(nextTimoutVar);
			nextTimoutVar = undefined;
		}
		progressPlayList(playlist);
	}
});

function getRandomFile(dir, cb) {
	fs.readdir(dir, (err, files) => {
		if(err) {
			return cb(err);
		}
		var f = dir + '/' + files[Math.floor(Math.random()*files.length)];
		fs.stat(f, (err, stats) => {
			if(err) {
				return cb(err);
			}
			if(stats.isDirectory()) {
				getRandomFile(f, cb);
			} else {
				cb(null, f);
			}
		});
	});
}

function hasExtension (f, exts) {	
	for(let e of exts) {
		if(f.endsWith (e)) {
			return true;
		}
	}
	
	return false;
}

function fillPlayList(count, playlist, cb) {
	playlist = playlist || [];
	
	// check playlist lenght before starting anything to avoid flooding it
	if(playlist.length >= count) {
		if(cb) {
			cb (playlist);
		}
		return;
	}
		
	getRandomFile (musicDir, (err, f) => {
		if(err) {
			console.log('Error: ' + err);
		} else {
			var isValid = hasExtension(f, exts);
			if(isValid) {
				playlist.push(f);
			} else {
				console.log('skipping: ' + f)
			}
		}
		
		// keep doing this ti'll the playlist has reach its count
		fillPlayList (count, playlist, cb);
	});
}

function progressPlayList(playlist) {
	currentFile = playlist.shift();
	console.log ('play: ' + currentFile)
	player.loadFile(currentFile);
	fillPlayList (playlistSize, playlist, (pl) => { sendPlaylistUpdate(); });
}

function playBit(bit) {
	var file = __dirname + '/soundbits/' + bit;

	player.getProperty('time-pos').then(function(t) {
		soundBitInfo.isActive = true;
		soundBitInfo.isStarted = false;
		soundBitInfo.prevTime = t;
		soundBitInfo.prevVolume = player.observed.volume;
		console.log('play bit: ' + file);
		console.log('will continue playing at ' + t);
		player.loadFile(file);
		player.volume(soundBitVolume);
	});
}

function handleCommand(data) {
	switch(data.cmd) {
		case 'togglePlay':
			player.togglePause ();
			break;
		case 'play':
			player.play ();
			break;
		case 'pause':
			player.pause ();
			break;
		case 'next':
			if(nextTimoutVar) {
				return;
			}
			playBit('next.mp3');
			nextTimoutVar = setTimeout(() => {
				nextTimoutVar = undefined;
				player.stop();  // this will cause the stop callback to trigger and start the next song
			}, nextDelay);
			break;
		case 'veto':
			if(nextTimoutVar) {
				playBit('veto.mp3');
				clearTimeout(nextTimoutVar);
				nextTimoutVar = undefined;
			}
			break;
		case 'volume':
			player.volume(data.value);
			break;
		case 'playBit':
			playBit(data.file);
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
		playing: !player.observed.pause,
		volume: player.observed.volume
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

app.get('/next', function(req, res, next){
	handleCommand ({ cmd: 'next' });
	res.redirect('/');
});

app.get('/stream', function(req, res){
	var rstream = fs.createReadStream(currentFile);
	rstream.pipe(res);	
});


io.on('connection', function (socket) {
	sendPlaylistUpdate(socket);
	sendPlayerStatus();
	socket.on('command', (data) => {
		handleCommand (data);
	});
});

// we first need to start up the web server
server.listen(port, () => {
	console.log('App listening on port ' + port);
});

// and then we can start playing music
fillPlayList(playlistSize, playlist, (pl) => {
	progressPlayList (pl);
});
