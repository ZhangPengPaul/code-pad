var express = require('express');
var bodyParser = require('body-parser');
var redis = require('redis');
//var io = require('socket.io');
var mu2Express = require('mu2express');
var util = require('util');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var crypto = require('crypto');
var	crypto_salt = 'salty';

// init db
var db = redis.createClient(6379, "192.168.1.203");
db.on('error', function (err){
	console.log('Error:' + err);
});

// run web server
app.engine('mustache', mu2Express.engine);
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// parse application/vnd.api+json as json
app.use(bodyParser.json({ type: 'application/vnd.api+json' }))
// app.use(express.body);
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/node_modules'));
server.listen(8888);


// routers

app.post('/create', function (req, res) {
	console.log('hahaha');
	req.end();
});
