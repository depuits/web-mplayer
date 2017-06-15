'use strict';

var mongo = require('./lib/mongo');
var audiolib = require('./lib/audiolib');

// initialize db connection
mongo.connect((err) => {
	if (err) {
		console.log(err);
		process.exit();
	}
	// update library
	audiolib.update();
});
