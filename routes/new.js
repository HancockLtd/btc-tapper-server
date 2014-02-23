
/*
 * GET new game page.
 */

exports.new = function(req, res){
  res.render('new', { title: 'express' });
};