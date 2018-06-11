'use strict';

var os = require('os');
var mpv = require('node-mpv');
var playerOptions = { audio_only: true };//*/, debug: true };

var player = new mpv(playerOptions);
module.exports = player;
