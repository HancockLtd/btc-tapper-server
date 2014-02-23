
/*
 * GET game page.
 */

exports.game = function(req, res){
  res.render('game', { 
    title: 'Bitgame',
    lobbysize: app.locals.lobby_size,
    countdown: app.locals.countdown
  });
};