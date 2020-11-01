const express = require('express');
const app = require('../lib/app');
const config = app.getConfig();
const router = new express.Router();

router.get('/', function (req, res) {
  res.render('index', {
    title: config.title,
    deadline: config.deadline,
    spendLimit: config['spend-limit']
  });
});

router.post('/mixitup', function (req, res) {
  //app.mixItUp({
  //  brand: req.body.brand,
  //  key: req.body.key,
  //  api: req.body.api,
  //  surveyId: req.body.surveyId
  //});
  //app.mixItUp(req.params.brand, req.body.key, req.body.api, req.body.surveyId);
  var personList = app.getContacts(req.params.brand, req.body.key, req.body.api, req.body.surveyId);
  console.log("personList: " + JSON.stringify(personList, undefined, 2));
  res.send('{ result : OK }');
});

router.get('/mixitup', function (req, res) {
  var personList = app.mixItUp(req.query.brand, req.query.key, req.query.api, req.query.surveyId);
  console.log("personList: " + JSON.stringify(personList, undefined, 2));
  res.send('{ personList : personList }');
});

router.post('/save', function (req, res) {
  app.addSubscriber({
    name: req.body.name,
    email: req.body.email,
    colour: req.body.colour,
    animal: req.body.animal,
    idea: req.body.idea
  });

  res.render('registered');
});

router.get('/login', app.ensureLoggedIn, function (req, res) {
  res.render('login');
});

router.post('/login', app.ensureLoggedIn, function (req, res, next) {
  if (req.body.password === config['admin-password']) {
    app.initSession(req, res);
    res.redirect('/admin');
    next();
  } else {
    res.render('login', {
      error: 'Incorrect password'
    });
  }
});

module.exports = router;
