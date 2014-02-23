
/*
 * GET new game page.
 */

exports.newgame = function(req, res){
  res.render('newgame', { 
  	title: 'Bitgame' ,
    maxlobby: app.locals.max_lobby,
  	lobbysize: app.locals.lobby_size,
  });
};