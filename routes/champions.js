var express = require('express');
var router = express.Router();
var champion = require('../models/champion');

// list all champions
router.get('/', function(req, res, next) {

  champion.getAll(function(err, result) {

    if(err) return next(err);
    res.render('champions', {
      champions: result,
      title: 'Champion List'
    });

  });

});

// list data for a specific champ
router.get('/:name', function(req, res, next) {

  champion.get(req.params.name, function(err, champData) {

    if(err) return next(err);
    if(!champData) {
      // no data
      console.log('no data');
    } else {
      // now get data for that champ
      champion.getPickedVersus(req.params.name, function(err, as) {
        if(err) return next(err);

        champion.getOpponents(req.params.name, function(err, vs) {
          if(err) return next(err);

          res.render('champion', {
            title: req.params.name,
            champ: champData,
            as: as,
            vs: vs
          });

        });

      });
    }

  });

});

module.exports = router;
