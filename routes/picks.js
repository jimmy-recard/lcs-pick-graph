var express = require('express');
var router = express.Router();
var champion = require('../models/champion');

// only accept data from POST requests
router.post('/', function(req, res, next) {

  var data = req.body;

  if(!data.name || !data.enemyTeam || !data.date) {
    return res.status(400).json({error: 'Missing params'});
  }

  // data ok
  champion.pickChamp(data.name, data.enemyTeam, data.date, function(err, result) {
    if(err) return next(err);
    return res.json({success: true});
  });

});

module.exports = router;
