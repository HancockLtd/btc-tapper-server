
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , routesNewgame = require('./routes/newgame')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , _ = require("underscore");

app = require('express')();


// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/newgame.html', routesNewgame.newgame);

server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


var io = require('socket.io').listen(server);
var gameClients = new Array();
var maxClients = 3;

var announceGracePeriod = 250; // units = milliseconds, 3 seconds

var announceDuration = 3 * 1000 + announceGracePeriod; // units = milliseconds, 3 seconds


var gameDuration = 10 * 1000; // units = milliseconds, 3 seconds

app.locals.lobby_size = gameClients.length;

app.locals.max_lobby = maxClients;


io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {

    console.log(data);



  });

  socket.on('join_game', function (data) {
    console.log('gameClients',gameClients);
    //set user cookie.
    //later this needs to be the bitcoin wallet id.

    if (!data.id) {
      //if the user hasn't sent an id, generate a new one.
      my_id = Math.random()*100000;
    } else {
      my_id = data.id;
    }

    userExists = _.indexOf(gameClients, my_id) !== -1;
    if (!userExists) {
      if (gameClients.length < maxClients) {
        socket.emit('create_user', {id: my_id });
        gameClients.push(my_id);
        socket.emit('lobby_size', {size: gameClients.length});
        socket.broadcast.emit('lobby_size', {size: gameClients.length});
        app.locals.lobby_size = gameClients.length;

        //Lobby is now full, start the game!
        if (gameClients.length == maxClients) {
          announceGame(socket);
        }
      } else {
        socket.emit('notification', {text:'Game Full!'});
      }
    } else {
      socket.emit('notification', {text:'You are already in the game!'});
    }

   
  });

  announceGame = function(socket) {
    console.log('announceGame');
    //notify all clients that game is starting
    socket.broadcast.emit('game_announce', {grace_period: announceGracePeriod});
    socket.emit('game_announce', {grace_period: announceGracePeriod});
    socket.emit('notification', {text:'Game is About to Start!'});
    //begin countdown!
    setTimeout(startGame, announceDuration, socket);
  };

  startGame = function(socket) {
    console.log('startGame');
    //game starts
    //enable accepting of button requests.
    socket.broadcast.emit('game_start');
    socket.emit('game_start');
    setTimeout(endGame, gameDuration, socket);
  }

  endGame = function(socket) {
    console.log('endGame');
    //game ends

    socket.broadcast.emit('game_end');
    socket.emit('game_end');
    //disable accepting of button requests.
    processResults(socket);
  }

  processResults = function (socket) {
    console.log('processResults');

    //compile all user submissions
    //choose a winner
    //send results data to all players

    socket.broadcast.emit('game_results', {});
    socket.emit('game_results', {});

  }

});

