'use strict';

var os = require('os');
var mpv = require('node-mpv');
var config = require('config').get('player');

var player = new mpv(config.options, config.arguments);

module.exports = player;
