'use strict';

var Promise = require("bluebird");
var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var config = require('config');
var conn = config.get('db');

Promise.promisifyAll(mongodb);

module.exports = {
	connect: function(callback) {
		return mongodb.MongoClient.connect(conn).then((client) => { 
			this.db = client.db('musiclib'); //TODO from conn or config
		});
	}
}
