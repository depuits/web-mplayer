'use strict';

var mongo = require('./lib/mongo');
var audiolib = require('./lib/audiolib');

// initialize db connection
mongo.connect().then(() => {
	return audiolib.update();
}).then((data) => {
	console.log('Scanned ' + data.length + ' items.');
	process.exit();
}).catch((err) => {
	console.log(err);
	process.exit();
});
