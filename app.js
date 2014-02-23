
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , routesNewgame = require('./routes/newgame')
  , routesGame = require('./routes/game')
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
app.get('/game.html', routesGame.game);


server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


var io = require('socket.io').listen(server);
var gameClients = new Array();
var maxClients = 3;

var announceGracePeriod = 250; // units = milliseconds, 3 seconds

var announceDuration = 3 * 1000 + announceGracePeriod; // units = milliseconds, 3 seconds

app.locals.announce_duration = announceDuration;




var gameDuration = 10 * 1000; // units = milliseconds, 3 seconds

app.locals.game_duration = gameDuration;

app.locals.lobby_size = gameClients.length;

app.locals.max_lobby = maxClients;


io.sockets.on('connection', function (socket) {
  socket.emit('connected');

  socket.on('auth_user', function (data) {
    console.log('auth_user');
    userExists = _.indexOf(gameClients, data.id) !== -1;
    if (userExists) {
      socket.emit('accept_user');
    } else {
      socket.emit('reject_user');
      socket.emit('notification', {text:'No game running, or not authorized for this game.'});
    }
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

    userExists = typeof _.findWhere(gameClients, {cid:my_id}) !== 'undefined';
    if (!userExists) {
      if (gameClients.length < maxClients) {
        socket.emit('create_user', {id: my_id });
        var newClient = new Object();
        newClient.cid=my_id;
        newClient.clickTime=false;
        gameClients.push(newClient);
        socket.emit('lobby_size', {size: gameClients.length});
        socket.broadcast.emit('lobby_size', {size: gameClients.length});
        app.locals.lobby_size = gameClients.length;

        //Lobby is now full, start the game!
        if (gameClients.length == maxClients) {
          announceGame(socket, gameClients);
        }
      } else {
        socket.emit('notification', {text:'Game Full!'});
      }
    } else {
      socket.emit('notification', {text:'You are already in the game!'});
    }

   
  });

  socket.on('button_click', function (data) {

    //set variables
    my_id = data.id;

    //check that the user exists 
    userExists = typeof _.findWhere(gameClients, {cid:my_id}) !== 'undefined';
    //check to make sure user has not already recorded a time
    clientTimeExists = typeof _.findWhere(gameClients, {cid:my_id, clickTime:false}) == 'undefined';

    if (!userExists) {
      console.log("something went teribly wrong");
    } else if (clientTimeExists) {

      console.log('user already hit the button');
      socket.emit('button_retried', {text:'You have already submitted a time!'});

    } else {

      //get time
      var d = new Date();
      var clientTime = d.getTime();
      //add time to client
      var clientOject = _.findWhere(gameClients, {cid:my_id});
      clientOject.clickTime=clientTime;


    console.log('Time recorded!');
    socket.emit('time_recorded', {text:'Your time has been recorded!'});
    }

    //check if this is the last user to hit the button
    lastUser = typeof _.findWhere(gameClients, {clickTime:false}) == 'undefined';
    if (lastUser) {
      //call game end function which will handle broadcasting
      console.log('Last user has hit the button. Let serve the results.');
      endGame(socket, gameClients);
    }

  });


  announceGame = function(socket, gameClients) {
    console.log('announceGame');
    //notify all clients that game is starting
    socket.broadcast.emit('game_announce', {grace_period: announceGracePeriod});
    socket.emit('game_announce', {grace_period: announceGracePeriod});
    socket.emit('notification', {text:'Game is About to Start!'});
    socket.broadcast.emit('notification', {text:'Game is About to Start!'});
    //begin countdown!
    setTimeout(startGame, announceDuration, socket, gameClients);
  };

  startGame = function(socket, gameClients) {
    console.log('startGame');
    //game starts
    //enable accepting of button requests.
    socket.broadcast.emit('game_start');
    socket.emit('game_start');
    setTimeout(endGame, gameDuration, socket);
  }

  endGame = function(socket, gameClients, clientTimes) {
    console.log('endGame');
    //game ends

    socket.broadcast.emit('game_end');
    socket.emit('game_end');
    //disable accepting of button requests.
    processResults(socket, gameClients, clientTimes);
  }

  processResults = function (socket, gameClients, clientTimes) {
    console.log('processResults');

    //compile all user submissions
    //choose a winner
    //send results data to all players

    socket.broadcast.emit('game_results', {});
    socket.emit('game_results', {});
    gameClients = new Array();
    app.locals.lobby_size = gameClients.length;
    console.log ("app.locals.lobby_size", app.locals.lobby_size);

    socket.broadcast.emit('game_reset');
    socket.emit('game_reset');

    socket.emit('lobby_size', {size: app.locals.lobby_size});
    socket.broadcast.emit('lobby_size', {size: app.locals.lobby_size});
  }

});

