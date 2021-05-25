// get an instance of mongoose and mongo
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// set up a mongoose model and pass it using
// module.exports

module.exports = mongoose.model('Sugerencia', new Schema({
 author: String,
 titulo: String,
 desc: String,
}));