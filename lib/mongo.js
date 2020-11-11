'use strict';

var Promise = require("bluebird");
var mongodb = require('mongodb');
var config = require('config').get('db');

Promise.promisifyAll(mongodb);

module.exports = {
	connect: async function(callback) {
		var client = await mongodb.MongoClient.connect(config.url, { useNewUrlParser: true, useUnifiedTopology: true });
		this.db = client.db(config.name);

		return client;
	}
}
