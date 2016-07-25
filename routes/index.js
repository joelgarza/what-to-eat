var fs = require('fs');
var express = require('express');
var request = require('request');
var Restaurant = require('../models/Restaurant');

var router = express.Router();


router.get('/', function(req, res, next) {
  res.render('index', { title: 'What to eat' });
});

var DEBUG = false;

router.post('/gps', function(req, res,next) {
  // todo(ibolmo): save the gp

  // lookup restaurants that are open nearby using the Google Places API
  var url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?' + [
    'key=AIzaSyCQDgYLniH8zXKfbBwZRyYo_Eczx2xo0eY',
    'location=' + req.body.latitude + ',' + req.body.longitude,
    'radius=8000',
    'opennow',
    'types=meal_takeaway|cafe|restaurant'
  ].join('&');

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var places = JSON.parse(body);
      if (!places) console.error('Could not parse body: ' + body);

      if (DEBUG) fs.writeFile('places.json', body);

      // for each restaurant save the restaurant information
      var restaurants = places.results.map(function(place){
        var restaurant = new Restaurant({
          name: place.name,
          placeid: place.place_id,
          google: {raw: place}
        });
        restaurant.save();
        return restaurant;
      });

      req.session.results = restaurants.map(function(restaurant){
        return restaurant.placeid;
      });

      res.redirect('/nearby');
    } else {
      res.send('error ' + error);
    }
  });

});

router.get('/nearby', function(req, res, next) {
  Restaurant.find({
    placeid: {
      $in: req.session.results
    }
  }, function(err, restaurants){
    var unique = {};
    res.render('nearby', {
      title: 'Restaurants open nearby',
      restaurants: restaurants.filter(function(restaurant){
        if (unique[restaurant.name]) return false;
        return unique[restaurant.name] = true;
      })
    });
  });
});

router.get('/choose', function(req, res,next) {
  var restaurants = [];

  res.render('choose', {
    title: 'Choose a final restaurant',
    restaurants: restaurants
  });
});

router.post('/choose/:placeid', function(req, res,next) {
  var restaurant = { placeid: 'temporary' };
  res.redirect('/restaurant/' + restaurant.placeid);
});

module.exports = router;
