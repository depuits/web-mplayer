'use strict';

var fs = require('fs');
var config = require('config');
var express = require("express");
var MPlayer = require('mplayer');
var player = new MPlayer();//*/{ debug: true });

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var musicDir = config.get('musicDir');
var exts = config.get('extensions');
var playlistSize = 20;
var playlist = [];
var requestlist = [];
var currentFile = '';

var skipStop = false;
var contTime = undefined;
var nextTimoutVar = undefined;

player.on('status', (stat) => {
	//console.log (stat);
	//sendPlayerStatus();
});

player.on('stop', () => {
	console.log('audio stopped: ' + contTime);
	if(skipStop) {
		console.log('skipping stop');
		skipStop = false;
		return;
	}

	if(contTime) {
		console.log('resuming play');
		console.log('of: ' + currentFile);
		console.log('at: ' + contTime);

		player.openFile(currentFile);
		player.seek(contTime);
		contTime = undefined;

		console.log (player.status);
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
	player.openFile(currentFile);
	fillPlayList (playlistSize, playlist, (pl) => { sendPlaylistUpdate(); });
}

function playBit(bit) {
	var file = __dirname + '/soundbits/' + bit;
	file = file.replace(/\\/g , "/"); // windows fix, mplayer doesn't handle backspaces well

	contTime = player.status.position;
	skipStop = true; // we need to skip the stop callback because it will be called when starting the next sound
	console.log('play bit: ' + file);
	console.log('will continue playing at ' + contTime);
	player.openFile(file);
}

function handleCommand(data) {
	switch(data.cmd) {
		case 'togglePlay':
			if(player.status.playing) {
				player.pause ();
			} else {
				player.play ();
			}
			sendPlayerStatus();
			break;
		case 'play':
			player.play ();
			break;
		case 'pause':
			player.pause ();
			break;
		case 'next':
			//playBit('next.mp3'); //TODO reenable
			nextTimoutVar = setTimeout(() => {
				nextTimoutVar = undefined;
				player.stop(); 
			}, 5000); // this will cause the stop callback to trigger and start the next song*/
			break;
		case 'veto':
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
	socket.emit('status', player.status);
}

//player.volume(100);

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
	socket.on('command', (data) => {
		handleCommand (data);
	});
});

// we first need to start up the web server
var port = config.get('port');
server.listen(port, () => {
	console.log('App listening on port ' + port);
});

// and then we can start playing music
fillPlayList(playlistSize, playlist, (pl) => {
	progressPlayList (pl);
});
