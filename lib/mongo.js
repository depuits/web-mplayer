'use strict';

var Promise = require("bluebird");
var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var config = require('config');
var dbUrl = config.get('dbUrl');
var dbName = config.get('dbName');

Promise.promisifyAll(mongodb);

module.exports = {
	connect: async function(callback) {
		var client = await mongodb.MongoClient.connect(dbUrl);
		this.db = client.db(dbName);

		return client;
	}
}
