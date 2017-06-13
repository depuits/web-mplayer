var MongoClient = require( 'mongodb' ).MongoClient;
var config = require('config');
var conn = config.get('db');

module.exports = {
	connect: function(callback) {
		MongoClient.connect(conn, function(err, db) {
			this.db = db;
			callback(err);
		});
	},
	get db() {
		return this.db;
	}
}
