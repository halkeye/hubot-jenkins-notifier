var express = require('express');
var router = express.Router();

router.post('/hubot/jenkins-notify', function(req, res, next) {
  console.log(req.body);

  res.status(200);
  res.send();
});

console.log('point your jenkins notification plugin to "http://<localip>:' + ( process.env.PORT || '3000') + '/hubot/jenkins-notify?room=test"');

module.exports = router;
