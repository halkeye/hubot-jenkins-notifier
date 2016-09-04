'use strict';
var Hubot, Path, adapterPath, badUrl, badUrls, fn, fn1, hubot_jenkins_notifier, i, j, len, len1, request, robot, should, sinon, test, test_data, urls;

process.env.PORT = 0;

Hubot = require('hubot');

Path = require('path');

request = require('supertest');

sinon = require('sinon');

should = require('should');

adapterPath = Path.join(Path.dirname(require.resolve('hubot')), "src", "adapters");

robot = Hubot.loadBot(adapterPath, "shell", true, "MochaHubot");

hubot_jenkins_notifier = require('../scripts/hubot-jenkins-notifier.js')(robot);

test_data = [
  {
    "name": "finished-failed",
    "expected_out": "JobName build #1 started failing: http://ci.jenkins.org/job/project name/5",
    "body": {
      "name": "JobName",
      "url": "JobUrl",
      "build": {
        "number": 1,
        "phase": "FINISHED",
        "status": "FAILURE",
        "url": "job/project%20name/5",
        "full_url": "http://ci.jenkins.org/job/project%20name/5",
        "parameters": {
          "branch": "master"
        }
      }
    }
  }, {
    "name": "finished-failed-nofull_url",
    "expected_out": "JobName build #1 started failing: job/project name/5",
    "body": {
      "name": "JobName",
      "url": "JobUrl",
      "build": {
        "number": 1,
        "phase": "FINISHED",
        "status": "FAILURE",
        "url": "job/project%20name/5",
        "parameters": {
          "branch": "master"
        }
      }
    }
  }, {
    "name": "started",
    "expected_out": "JobName build #2 started: http://ci.jenkins.org/job/project name/5",
    "body": {
      "name": "JobName",
      "url": "JobUrl",
      "build": {
        "number": 2,
        "phase": "STARTED",
        "url": "job/project%20name/5",
        "full_url": "http://ci.jenkins.org/job/project%20name/5",
        "parameters": {
          "branch": "master"
        }
      }
    }
  }, {
    "name": "started-with-previous-failed",
    "expected_out": "JobName build #2 started: http://ci.jenkins.org/job/project name/5",
    "previousBuildFailed": true,
    "body": {
      "name": "JobName",
      "url": "JobUrl",
      "build": {
        "number": 2,
        "phase": "STARTED",
        "url": "job/project%20name/5",
        "full_url": "http://ci.jenkins.org/job/project%20name/5",
        "parameters": {
          "branch": "master"
        }
      }
    }
  }
];

urls = {
  'new': "/hubot/jenkins-notify?room=%23halkeye&always_notify=1",
  'old': "/hubot/jenkins-notify?room=%23halkeye&notstrat=FS"
};

fn = function(test) {
  var results, url, url_type;
  results = [];
  for (url_type in urls) {
    url = urls[url_type];
    results.push((function(url_type, url) {
      return describe(test.name + '-' + url_type, function() {
        before(function(done) {
          var endfunc;
          robot.jenkins_notifier.reset();
          robot.adapter.send = sinon.spy();
          endfunc = function(err, res) {
            if (err) {
              throw err;
            }
            return done();
          };
          if (test.previousBuildFailed) {
            console.log("Marking job as previously failed", test.body.name);
            robot.jenkins_notifier.storeAsFailed(test.body.name);
          }
          request(robot.router).post(url).send(JSON.stringify(test.body)).expect(200).end(endfunc);
        });
        it('Robot sent out respond', function() {
          if (test.expected_out === false) {
            return robot.adapter.send.called.should.be["false"];
          } else {
            return robot.adapter.send.called.should.be["true"];
          }
        });
        it('Robot sent to right room', function() {
          var send_arg;
          if (test.expected_out === false) {

          } else {
            should.exist(robot.adapter.send.getCall(0));
            should.exist(robot.adapter.send.getCall(0).args);
            robot.adapter.send.getCall(0).args.should.be.Array;
            send_arg = robot.adapter.send.getCall(0).args[0];
            send_arg.user.room.should.eql('#halkeye');
            return send_arg.room.should.eql('#halkeye');
          }
        });
        return it('Robot sent right message', function() {
          if (test.expected_out === false) {

          } else {
            should.exist(robot.adapter.send.getCall(0));
            should.exist(robot.adapter.send.getCall(0).args);
            robot.adapter.send.getCall(0).args.should.be.Array;
            return robot.adapter.send.getCall(0).args[1].should.eql(test.expected_out);
          }
        });
      });
    })(url_type, url));
  }
  return results;
};
for (i = 0, len = test_data.length; i < len; i++) {
  test = test_data[i];
  fn(test);
}

badUrls = [
  {
    name: "",
    url: "/hubot/jenkins-notify?room=%23halkeye&user=someusername",
    expectedResponse: "",
    expectedResponseCode: 400,
    body: {
      "name": "JobName",
      "url": "JobUrl",
      "build": {
        "number": 1,
        "phase": "FINISHED",
        "status": "FAILURE",
        "url": "job/project%20name/5",
        "full_url": "http://ci.jenkins.org/job/project%20name/5",
        "parameters": {
          "branch": "master"
        }
      }
    }
  }, {
    name: "",
    url: "/hubot/jenkins-notify",
    expectedResponse: "",
    expectedResponseCode: 400,
    body: {
      "name": "JobName",
      "url": "JobUrl",
      "build": {
        "number": 1,
        "phase": "FINISHED",
        "status": "FAILURE",
        "url": "job/project%20name/5",
        "full_url": "http://ci.jenkins.org/job/project%20name/5",
        "parameters": {
          "branch": "master"
        }
      }
    }
  }
];

fn1 = function(badUrl) {
  return describe(badUrl.name + ': ' + badUrl.url, function() {
    before(function(done) {
      var endfunc;
      robot.jenkins_notifier.reset();
      robot.adapter.send = sinon.spy();
      endfunc = function(err, res) {
        if (err) {
          throw err;
        }
        return done();
      };
      request(robot.router).post(badUrl.url).send(JSON.stringify(badUrl.body)).expect(badUrl.expectedResponseCode).end(endfunc);
    });
    return it('Robot sent out correct response code', function() {
      return robot.adapter.send.called.should.be["false"];
    });
  });
};
for (j = 0, len1 = badUrls.length; j < len1; j++) {
  badUrl = badUrls[j];
  fn1(badUrl);
}

// ---
// generated by coffee-script 1.9.2