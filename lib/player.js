'use strict';

var os = require('os');
var mpv = require('node-mpv');
var config = require('config');

var player = new mpv(config.get('playerOptions'), config.get('playerArguments'));
module.exports = player;
