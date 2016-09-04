/* eslint-env mocha */
'use strict';
process.env.PORT = 0;

require("coffee-script/register");
var Hubot = require('hubot');
var Path = require('path');
var should = require('should');

var adapterPath = Path.join(Path.dirname(require.resolve('hubot')), "src", "adapters");
var robot = Hubot.loadBot(adapterPath, "shell", true, "MochaHubot");

//var Helper = require('hubot-test-helper');
//var scriptHelper = new Helper('./scripts/hubot-jenkins-notifier.js')

var JenkinsNotifier = require('../scripts/hubot-jenkins-notifier.js');
JenkinsNotifier(robot);
var JenkinsNotifierRequest = JenkinsNotifier.JenkinsNotifierRequest;

describe("JenkinsNotifierRequest.buildEnvelope", function() {
  it("username and room should throw exception", function() {
    (function(){
      JenkinsNotifierRequest.buildEnvelope(JenkinsNotifierRequest.buildQueryObject(
        "/hubot/jenkins-notify?room=%23halkeye&user=someusername"
      ));
    }).should.throw();
  });
  it("always_notify", function() {
    var envelope = JenkinsNotifierRequest.buildEnvelope(JenkinsNotifierRequest.buildQueryObject("/hubot/jenkins-notify?room=%23halkeye&always_notify=1"));
    should(envelope).have.eql({
      onStart: '',
      onFinished: 'FS',
      user: { room: '#halkeye' },
      room: '#halkeye'
    });
  });
  it("notstrat", function() {
    var envelope = JenkinsNotifierRequest.buildEnvelope(JenkinsNotifierRequest.buildQueryObject("/hubot/jenkins-notify?room=%23halkeye&notstrat=FS"));
    should(envelope).have.eql({
      onStart: '',
      onFinished: 'FS',
      user: { room: '#halkeye' },
      room: '#halkeye'
    });
  });
  it("onStart", function() {
    var envelope = JenkinsNotifierRequest.buildEnvelope(JenkinsNotifierRequest.buildQueryObject("/hubot/jenkins-notify?room=%23halkeye&onStart=FS"));
    should(envelope).have.eql({
      onStart: 'FS',
      onFinished: '',
      user: { room: '#halkeye' },
      room: '#halkeye'
    });  
  });
  it("onFinished", function() {
    var envelope = JenkinsNotifierRequest.buildEnvelope(JenkinsNotifierRequest.buildQueryObject("/hubot/jenkins-notify?room=%23halkeye&onFinished=FS"));
    should(envelope).have.eql({
      onStart: '',
      onFinished: 'FS',
      user: { room: '#halkeye' },
      room: '#halkeye'
    });  
  });
});

var test_data = [
  {
    "name": "finished-failed",
    "expected_out": ["JobName build #1 started failing: http://ci.jenkins.org/job/project name/5"],
    "body": {
      "name": "JobName",
      "url": "JobUrl",
      "build": {
        "number": 1,
        "phase": "FINISHED",
        "status": "FAILURE",
        "url": "job/project name/5",
        "full_url": "http://ci.jenkins.org/job/project name/5",
        "parameters": {
          "branch": "master"
        }
      }
    }
  }, {
    "name": "finished-failed-nofull_url",
    "expected_out": ["JobName build #1 started failing: job/project name/5"],
    "body": {
      "name": "JobName",
      "url": "JobUrl",
      "build": {
        "number": 1,
        "phase": "FINISHED",
        "status": "FAILURE",
        "url": "job/project name/5",
        "parameters": {
          "branch": "master"
        }
      }
    }
  }, {
    "name": "started",
    "expected_out": ["JobName build #2 started: http://ci.jenkins.org/job/project name/5"],
    "body": {
      "name": "JobName",
      "url": "JobUrl",
      "build": {
        "number": 2,
        "phase": "STARTED",
        "url": "job/project name/5",
        "full_url": "http://ci.jenkins.org/job/project name/5",
        "parameters": {
          "branch": "master"
        }
      }
    }
  }, {
    "name": "started-with-previous-failed",
    "expected_out": ["JobName build #2 started: http://ci.jenkins.org/job/project name/5"],
    "previousBuildFailed": true,
    "body": {
      "name": "JobName",
      "url": "JobUrl",
      "build": {
        "number": 2,
        "phase": "STARTED",
        "url": "job/project name/5",
        "full_url": "http://ci.jenkins.org/job/project name/5",
        "parameters": {
          "branch": "master"
        }
      }
    }
  }
];
test_data.forEach(function(test) {
  describe(test.name, function() {
    //after(function() { this.room.destroy(); })
    before(function() {
      //this.room = scriptHelper.createRoom();
      this.notifier = new JenkinsNotifierRequest();
      if (test.previousBuildFailed) {
        var failed = {};
        failed[test.body.name] = 1;
        this.notifier.setFailed(failed);
      }
      this.notifier.setQuery(JenkinsNotifierRequest.buildQueryObject(
        "/hubot/jenkins-notify?room=%23halkeye&onStart=FS&onStarted=FS&onFinished=FS"
      ));
      this.messages = this.notifier.process(test.body);
    });
    it('Robot sent out respond', function() {
      should(this.messages).have.eql(test.expected_out);
    });
  });
});