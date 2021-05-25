// get the packages we need

function responseFormater(success, json, error = undefined) {
	json.success = success;

	if (error != undefined)
		json.error = error;

	return json;
}
const cors = require('cors');
var express = require('express')
var app = express();

var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
require('mongoose-double')(mongoose);

var crypto = require('crypto');

var jwt = require('jsonwebtoken');
var config = require('./config');

var User = require('./app/models/user');
var Sugerencia = require('./app/models/sugerencia');


// configuration

var port = process.env.PORT || 8082;
mongoose.connect(config.database);

app.use(cors());
app.options('*', cors());

app.set('superSecret', config.secret);

// use body parser so we can get info from POST
// and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

//
// routes
//



// add demo user

app.get('/setup', function (req, res) {
	// create a sample user
	var nick = new User({
		name: 'anonimo',
		password: '12345',
		admin: true
	});

	nick.save(function (err) {
		if (err) throw err;
		console.log('User saved suscessfully');
	});

	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype'); // If needed

	var name = 'anonimo';
	var password = '12345';

	//find the user
	User.findOne({ name: name.toLowerCase() }, function (err, user) {
		if (err) throw err;

		if (!user) {
			res.json({
				success: false, message:
					'Authentication failed, User not found'
			});
		}
		else if (user) {
			// check if password matches
			if (user.password != password) {
				res.json({
					success: false, message:
						'Authentication failed, wrong password'
				});
			}
			else {
				// user and password is right
				var id = user._id.toString();
				var token = jwt.sign({ uid: id }, app.get('superSecret'), {
					expiresIn: 60 * 60
				});

				// return the information including token as JSON

				res.json({
					success: true,
					message: 'Enjoy your token !',
					token: token
				});

			}
		}
	});
});

// api routes

var apiRoutes = express.Router();

// Sign up a new user

apiRoutes.post('/signup', function (req, res) {
	var name = req.body.name;
	var password = req.body.password;
	var password_confirm = req.body.password_confirm;

	if (name == undefined || password == undefined || password_confirm == undefined) {
		res.json(responseFormater(false, {}, "name, pass and pass_confirm are required"));
	}
	else if (password != password_confirm) {
		res.json(responseFormater(false, {}, "pass and pass_confirm must match"));
	}
	else {
		name = name.toLowerCase();
		User.count({ name: name }, function (error, count) {
			console.log(count);
			if (error) {
				console.trace("I am here");
				res.json({ fatal: "Fallo en querie" });
			}
			else if (count != 0) {
				res.json(responseFormater(false, {}, "username already exist. Login or choose another one"));
			}
			else {
				User.create({ name: name, password: password }, function (error, user) {
					if (error) {
						console.trace("I am here");
						res.json({ fatal: "Fallo en query" });
					}
					else {
						user.password = undefined;
						res.json(user);
					}
				});
			}
		});
	}
})

// Get a token
apiRoutes.post('/login', function (req, res) {

	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype'); // If needed

	var name = req.body.name;
	var password = req.body.password;

	if (name == undefined || password == undefined) {
		res.json(responseFormater(false, {}, "name and pass are required"));
		return;
	}

	//find the user
	User.findOne({ name: name.toLowerCase() }, function (err, user) {
		if (err) throw err;

		if (!user) {
			res.json({
				success: false, message:
					'Authentication failed, User not found'
			});
		}
		else if (user) {
			// check if password matches
			if (user.password != password) {
				res.json({
					success: false, message:
						'Authentication failed, wrong password'
				});
			}
			else {
				// user and password is right
				var id = user._id.toString();
				var token = jwt.sign({ uid: id }, app.get('superSecret'), {
					expiresIn: 60 * 60
				});

				// return the information including token as JSON

				res.json({
					success: true,
					message: 'Enjoy your token !',
					token: token
				});

			}
		}
	});
});

// route to middleware to verify a token

apiRoutes.use(function (req, res, next) {
	// check header or url parameters or post parameters for token
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype'); // If needed
	//res.setHeader('Access-Control-Allow-Credentials', true); // If needed


	var token = req.body.token ||
		req.query.token ||
		req.headers['x-access-token'];
	// decode token
	if (token) {
		// verifies secret and checks up
		jwt.verify(token, app.get('superSecret'), function (err, decoded) {
			if (err) {
				return res.json({ success: false, message: 'Failed to authenticate token' });

			} else {
				// is everything is good, save to request for use in other routes
				User.findOne({ _id: mongoose.Types.ObjectId(decoded.uid) }, function (error, obj) {
					if (error) {
						res.json(responseFormater(false, {}, "Invalid user. Sorry."));
						return;
					}
					req.user = obj;
					next();
				});
			}
		});
	} else {
		// if there is not token, return an error

		return res.status(403).send({
			success: false,
			message: 'No token provided'
		});
	}
});

apiRoutes.get('/sugerencia', function (req, res) {
	Sugerencia.find({}, function (error, sugerencias) {
		//res.json(responseFormater(true, { sugerencias: sugerencias }));
		res.json(JSON.stringify(sugerencias));
	});
});

apiRoutes.post('/sugerencia', function (req, res) {

	var author = req.body.author;
	var titulo = req.body.titulo;
	var desc = req.body.desc;

	if (author == undefined || titulo == undefined || desc == undefined) {
		res.json(responseFormater(false, {}, "Author, titulo and descripcion are required"));
	}
	else {
		Sugerencia.create({ author: author, titulo: titulo, desc: desc }, function (error, sugerencias) {
			if (error) {
				console.log(error);
				console.trace();
				res.json(responseFormater(false, {}, "Error while making the query. Please report"));
			}
			else {
				res.json(responseFormater(true, { sugerencias: sugerencias }));
			}
		});
	}
});

apiRoutes.post('/sugerencia/delete', function (req, res) {
	var titulo = req.body.titulo;
	Sugerencia.deleteOne({ titulo: titulo }, function (error) {
		if (error) {
			res.json(responseFormater(false, {}, "Please report this incident"));
			console.trace();
		}else {
			res.json(responseFormater(true, {}, "Borrado exitoso"));
		}
	});
});

app.use('/api', apiRoutes);
app.disable('etag');

// start the server
app.listen(port);
