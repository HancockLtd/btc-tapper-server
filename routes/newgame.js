
/*
 * GET new game page.
 */

exports.newgame = function(req, res){
  res.render('newgame', { title: 'express' });
};