var express = require('express');
var bodyParser = require('body-parser');
var redis = require('redis');
var io = require('socket.io');
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

// Create document request
app.post('/create', function (req, res) {
	db.incr('document_id', function (err, val){
		var param = crypto.createHash('sha1').update('salty' + val).digest('hex');
		console.log(param);
		res.redirect('/docs/' + crypto.createHash('sha1').update('salty' + val).digest('hex'));
		//res.send('document created successful, document_id = ' + val);
	});	
});

// Document Page
app.get(/\/docs\/([A-Za-z0-9]{20})\/?/, function (req, res){
	console.log(req.params);
	db.get("document." + req.params[0], function (err, reply) {
		reply = reply == null ? '' : new Buffer(reply, 'base64').toString('utf-8');
		res.render('docs', {'locals' : {'content' : reply, 'id' : req.params[0]}});
	});
});

// Set up socket.io connection
io.on('connection', function (socket) {
  
  // set document, socket ids
  var document_id = 0;
  
  // bind method to map connections
  socket.on('bind', function (id) {
    console.info('socket ' + socket.id + ' bound to document ' + id.document_id);
    document_id = id.document_id;
    socket.emit('bound', {id:socket.id});
  });

  // text changed
  socket.on('update', function (data) {
    console.info('update on socket ' + socket.id + ' for document ' + document_id);
    
    // get the old content
    db.get(
      "document."+document_id,
      function(err, reply) {
        reply = reply == null ? '' : new Buffer(reply, 'base64').toString('utf8');
        
        //console.log('old text: ' + reply);
        //console.log('new text:' + data.text);
        // merge the new content
        var d = data;
        console.log('from: ' + data.from);
        do {
          // calculate offsets 
          var lines = reply.split('\n');
          console.log("lines length: " + lines.length);
          console.log("lines: " + lines);
          var offsets = [];
          for (var l=0; l < lines.length; ++l) {
            if (l == 0)
              offsets.push(0);
            else
              offsets.push(lines[l-1].length + offsets[l-1] + 1);
          }

          console.log(offsets);
          
          console.log('d.to ' + d.to.line);
          console.log('d.to ' + d.to.ch);
          console.log('d.from ' + d.from.line);
          console.log('d.from ' + d.from.ch);
          // perform edits
          var i = offsets[d.to.line] + d.to.ch;
          var j = offsets[d.from.line] + d.from.ch;
          if (i > j) {
            var k = j;
            j = i;
            i = k;
          }
          reply = reply.substring(0, i) + d.text.join('\n') + reply.substring(j);
          d = d.next;
        } while (d != undefined);
        
        console.log('Saving string:\n\n' + reply);
        
        // save the new content
        db.set(
          "document."+document_id,
          new Buffer(reply).toString('base64'),
          function (err, reply) {
            if (err != null) {
              console.log(err);
            }
            socket.broadcast.emit('update-'+document_id, data);
          }
        );
      }
    );
  });

  // disconnecting clients
  socket.on('disconnect', function () {
  });
});
