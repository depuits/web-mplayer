var fs = require('fs');
var config = require('config');
var express = require("express");
var MPlayer = require('mplayer');
var player = new MPlayer();//*/{ debug: true });

var app = express();

var musicDir = config.get('musicDir');
var exts = config.get('extensions');
var playlist = [];
var currentFile = '';

player.on('status', (stat) => {
	//console.log (stat);
});

player.on('stop', () => {
	progressPlayList (playlist);
});

function getRandomFile (dir, cb) {
	fs.readdir(dir, (err, files) => {
		if (err) {
			return cb (err);
		}
		var f = dir + '/' + files[Math.floor(Math.random()*files.length)];
		fs.stat (f, (err, stats) => {
			if (err) {
				return cb (err);
			}
			if (stats.isDirectory ()) {
				getRandomFile (f, cb);
			} else {
				cb (null, f);
			}
		});
	});
}

function hasExtension (f, exts) {	
	for (let e of exts) {
		if (f.endsWith (e)) {
			return true;
		}
	}
	
	return false;
}

function fillPlayList (count, playlist, cb) {
	playlist = playlist || [];
	
	// check playlist lenght before starting anything to avoid flooding it
	if (playlist.length >= count) {
		if (cb) {
			cb (playlist);
		}
		return;
	}
		
	getRandomFile (musicDir, (err, f) => {
		if (err) {
			console.log ('Error: ' + err);
		} else {
			var isValid = hasExtension (f, exts);
			if (isValid) {
				playlist.push (f);
			} else {
				console.log ('skipping: ' + f)
			}
		}
		
		// keep doing this ti'll the playlist has reach its count
		fillPlayList (count, playlist, cb);
	});
}

function progressPlayList (playlist) {
	currentFile = playlist.shift();
	console.log ('play: ' + currentFile)
	player.openFile(currentFile);
	fillPlayList (20, playlist);
}

//player.volume(100);

//app.use(express.static("public"));

app.get ('/', function(req, res, next){
	res.status(200).json(playlist);
});

app.get ('/play', function(req, res, next){
	player.play (); // this will cause the stop callback to trigger and start the next song
    res.redirect('/');
});
app.get ('/pause', function(req, res, next){
	player.pause (); // this will cause the stop callback to trigger and start the next song
    res.redirect('/');
});

app.get ('/next', function(req, res, next){
	player.stop (); // this will cause the stop callback to trigger and start the next song
    res.redirect('/');
});

app.listen(3003,function(){
	console.log('App listening on port 3003!');
});

app.get('/stream', function(req, res){
	var rstream = fs.createReadStream(currentFile);
	rstream.pipe(res);	
});

fillPlayList (20, playlist, (pl) => {
	progressPlayList (pl);
});