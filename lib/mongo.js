var Promise = require("bluebird");
var mongodb = require('mongodb');
var config = require('config');
var conn = config.get('db');

Promise.promisifyAll(mongodb);

module.exports = {
	connect: function(callback) {
		return mongodb.MongoClient.connectAsync(conn).then((db) => { this.db = db; });
	}
}
