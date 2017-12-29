'use strict';

var Promise = require("bluebird");
var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var config = require('config');
var dbUrl = config.get('dbUrl');
var dbName = config.get('dbName');

Promise.promisifyAll(mongodb);

module.exports = {
	connect: function(callback) {
		return mongodb.MongoClient.connect(dbUrl).then((client) => { 
			this.db = client.db(dbName);
		});
	}
}
