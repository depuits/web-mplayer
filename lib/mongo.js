var MongoClient = require( 'mongodb' ).MongoClient;
var config = require('config');
var conn = config.get('db');

module.exports = {
	connect: function(callback) {
		MongoClient.connect(conn, (err, db) => {
			this.db = db;
			callback(err);
		});
	}
}
