/* eslint-env mocha */
'use strict';
process.env.PORT = 0;

require("coffee-script/register");
var Hubot = require('hubot');
var Path = require('path');
var should = require('should');
should.config.checkProtoEql = false;


var adapterPath = Path.join(Path.dirname(require.resolve('hubot')), "src", "adapters");
var robot = Hubot.loadBot(adapterPath, "shell", true, "MochaHubot");

//var Helper = require('hubot-test-helper');
//var scriptHelper = new Helper('./scripts/hubot-jenkins-notifier.js')

var JenkinsNotifier = require('../scripts/hubot-jenkins-notifier.js');
var jenkinsNotifier = JenkinsNotifier(robot);
var JenkinsNotifierRequest = JenkinsNotifier.JenkinsNotifierRequest;

var commonBodies = {
  "STARTED":{
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
  },
  "COMPLETED_SUCCESS":{
    "name": "JobName",
    "url": "JobUrl",
    "build": {
      number: 69,
      queue_id: 69,
      phase: 'COMPLETED',
      status: 'SUCCESS',
      url: 'job/Jobname/69/',
      scm: {},
      log: 'Started by user admin\nNotifying endpoint \'HTTP:http://192.168.168.128:9001/hubot/jenkins-notify?room=general&always_notify=1&trace=1\'\nBuilding in workspace /var/jenkins_home/workspace/Jobname\n[Jobname] $ /bin/sh -xe /tmp/hudson5174919973359476640.sh\nNotifying endpoint \'HTTP:http://192.168.168.128:9001/hubot/jenkins-notify?room=general&always_notify=1&trace=1\'\n',
      artifacts: {}
    }
  },
  "COMPLETED_FAILURE":{
    "name": "JobName",
    "url": "JobUrl",
    "build": {
      number: 70,
      queue_id: 70,
      phase: 'COMPLETED',
      status: 'FAILURE',
      url: 'job/Jobname/70/',
      scm: {},
      log: 'Started by user admin\nNotifying endpoint \'HTTP:http://192.168.168.128:9001/hubot/jenkins-notify?room=general&always_notify=1&trace=1\'\nBuilding in workspace /var/jenkins_home/workspace/Jobname\n[Jobname] $ /bin/sh -xe /tmp/hudson326640172349901710.sh\n+ fail and break this build!\n/tmp/hudson326640172349901710.sh: 3: /tmp/hudson326640172349901710.sh: fail: not found\nBuild step \'Execute shell\' marked build as failure\nNotifying endpoint \'HTTP:http://192.168.168.128:9001/hubot/jenkins-notify?room=general&always_notify=1&trace=1\'\n',
      artifacts: {}
    }
  },
  "FINALIZED_SUCCESS":{
    "name": "JobName",
    "url": "JobUrl",
    "build": {
      number: 69,
      queue_id: 69,
      phase: 'FINALIZED',
      status: 'SUCCESS',
      url: 'job/Jobname/69/',
      scm: {},
      log: 'Started by user admin\nNotifying endpoint \'HTTP:http://192.168.168.128:9001/hubot/jenkins-notify?room=general&always_notify=1&trace=1\'\nBuilding in workspace /var/jenkins_home/workspace/Jobname\n[Jobname] $ /bin/sh -xe /tmp/hudson5174919973359476640.sh\nNotifying endpoint \'HTTP:http://192.168.168.128:9001/hubot/jenkins-notify?room=general&always_notify=1&trace=1\'\nFinished: SUCCESS\n',
      artifacts: {}
    }
  },
  "FINALIZED_FAILURE":{
    "name": "JobName",
    "url": "JobUrl",
    "build": {
      number: 70,
      queue_id: 70,
      phase: 'FINALIZED',
      status: 'FAILURE',
      url: 'job/Jobname/70/',
      scm: {},
      log: 'Started by user admin\nNotifying endpoint \'HTTP:http://192.168.168.128:9001/hubot/jenkins-notify?room=general&always_notify=1&trace=1\'\nBuilding in workspace /var/jenkins_home/workspace/Jobname\n[Jobname] $ /bin/sh -xe /tmp/hudson326640172349901710.sh\n+ fail and break this build!\n/tmp/hudson326640172349901710.sh: 3: /tmp/hudson326640172349901710.sh: fail: not found\nBuild step \'Execute shell\' marked build as failure\nNotifying endpoint \'HTTP:http://192.168.168.128:9001/hubot/jenkins-notify?room=general&always_notify=1&trace=1\'\nFinished: FAILURE\n',
      artifacts: {}
    }
  },
  "FINISHED_FAILURE_fullURL": {
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
  },
  "FINISHED_FAILURE": {
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
  },
  "FINISHED_SUCCESS": {
    "name": "JobName",
    "url": "JobUrl",
    "build": {
      "number": 1,
      "phase": "FINISHED",
      "status": "SUCCESS",
      "url": "job/project name/5",
      "parameters": {
        "branch": "master"
      }
    }
  },
  "BAD_BAD_BAD": {
    "name": "JobName",
    "url": "JobUrl",
    "build": {
      "number": "non number",
      "phase": "BAD",
      "status": "BAD",
      "url": "job/project name/5",
      "parameters": {
        "branch": "master"
      }
    }
  },
}

describe("JenkinsNotifier.shouldNotify", function() {
  /* TODO: add unknown status tests */
  describe("started job", function() {
    it("started job, previous job failed, and onStarted=S", function() {
      var notifier = new JenkinsNotifierRequest();
      notifier.setStatus("FAILURE");
      notifier.setQuery({onStart: 'S' });
      should(notifier.shouldNotify(commonBodies.STARTED)).be.false();
    });
    it("previous job failed, and onStarted=F", function() {
        var notifier = new JenkinsNotifierRequest();
        notifier.setStatus("FAILURE");
        notifier.setQuery({onStart: 'F' });
        should(notifier.shouldNotify(commonBodies.STARTED)).be.true();
    });
    it("previous job success, and onStarted=S", function() {
        var notifier = new JenkinsNotifierRequest();
        notifier.setStatus("SUCCESS");
        notifier.setQuery({onStart: 'S' });
        should(notifier.shouldNotify(commonBodies.STARTED)).be.true();
    });
    it("previous job success, and onStarted=F", function() {
        var notifier = new JenkinsNotifierRequest();
        notifier.setStatus("SUCCESS");
        notifier.setQuery({onStart: 'F' });
        should(notifier.shouldNotify(commonBodies.STARTED)).be.false();
    });
  });
  describe("finished job - failure", function() {
    it("previous job failed, and onFinished=S", function() {
        var notifier = new JenkinsNotifierRequest();
        notifier.setStatus("FAILURE");
        notifier.setQuery({onFinished: 'S' });
        should(notifier.shouldNotify(commonBodies.FINISHED_FAILURE)).be.false();
    });
    it("previous job failed, and onFinished=F", function() {
        var notifier = new JenkinsNotifierRequest();
        notifier.setStatus("FAILURE");
        notifier.setQuery({onFinished: 'F' });
        should(notifier.shouldNotify(commonBodies.FINISHED_FAILURE)).be.true();
    });
    it("previous job success, and onFinished=S", function() {
        var notifier = new JenkinsNotifierRequest();
        notifier.setStatus("SUCCESS");
        notifier.setQuery({onFinished: 'S' });
        should(notifier.shouldNotify(commonBodies.FINISHED_FAILURE)).be.false();
    });
    it("previous job success, and onFinished=F", function() {
        var notifier = new JenkinsNotifierRequest();
        notifier.setStatus("SUCCESS");
        notifier.setQuery({onFinished: 'F' });
        should(notifier.shouldNotify(commonBodies.FINISHED_FAILURE)).be.true();
    });
  });
  describe("finished job - success", function() {
        it("previous job failed, and onFinished=S", function() {
        var notifier = new JenkinsNotifierRequest();
        notifier.setStatus("FAILURE");
        notifier.setQuery({onFinished: 'S' });
        should(notifier.shouldNotify(commonBodies.FINISHED_SUCCESS)).be.true();
    });
    it("previous job failed, and onFinished=F", function() {
        var notifier = new JenkinsNotifierRequest();
        notifier.setStatus("FAILURE");
        notifier.setQuery({onFinished: 'F' });
        should(notifier.shouldNotify(commonBodies.FINISHED_SUCCESS)).be.false();
    });
    it("previous job success, and onFinished=S", function() {
        var notifier = new JenkinsNotifierRequest();
        notifier.setStatus("SUCCESS");
        notifier.setQuery({onFinished: 'S' });
        should(notifier.shouldNotify(commonBodies.FINISHED_SUCCESS)).be.true();
    });
    it("previous job success, and onFinished=F", function() {
        var notifier = new JenkinsNotifierRequest();
        notifier.setStatus("SUCCESS");
        notifier.setQuery({onFinished: 'F' });
        should(notifier.shouldNotify(commonBodies.FINISHED_SUCCESS)).be.false();
    });
    it("previous job failure, and onFinished=s", function() {
        var notifier = new JenkinsNotifierRequest();
        notifier.setStatus("FAILURE");
        notifier.setQuery({onFinished: 'Fs' });
        should(notifier.shouldNotify(commonBodies.FINISHED_SUCCESS)).be.true();
    });
    it("previous job success, and onFinished=s", function() {
        var notifier = new JenkinsNotifierRequest();
        notifier.setStatus("SUCCESS");
        notifier.setQuery({onFinished: 'Fs' });
        should(notifier.shouldNotify(commonBodies.FINISHED_SUCCESS)).be.false();
    });
  });
});

describe("JenkinsNotifierRequest.buildEnvelope", function() {
  it("username and room should throw exception", function() {
    (function(){
      JenkinsNotifierRequest.buildEnvelope(JenkinsNotifierRequest.buildQueryObject(
        "/hubot/jenkins-notify?room=%23halkeye&user=someusername"
      ));
    }).should.throw();
  });
});
describe("JenkinsNotifierRequest.buildQueryObject", function() {
  it("always_notify", function() {
    var query = JenkinsNotifierRequest.buildQueryObject("/hubot/jenkins-notify?room=%23halkeye&always_notify=1");
    should(query).have.eql({
      onStart: '',
      onFinished: 'FS',
      room: '#halkeye'
    });
  });
  it("notstrat", function() {
    var query = JenkinsNotifierRequest.buildQueryObject("/hubot/jenkins-notify?room=%23halkeye&notstrat=FS");
    should(query).have.eql({
      onStart: '',
      onFinished: 'FS',
      room: '#halkeye'
    });
  });
  it("onStart", function() {
    var query = JenkinsNotifierRequest.buildQueryObject("/hubot/jenkins-notify?room=%23halkeye&onStart=FS");
    should(query).have.eql({
      onStart: 'FS',
      onFinished: '',
      room: '#halkeye'
    });
  });
  it("onFinished", function() {
    var query = JenkinsNotifierRequest.buildQueryObject("/hubot/jenkins-notify?room=%23halkeye&onFinished=FS");
    should(query).have.eql({
      onStart: '',
      onFinished: 'FS',
      room: '#halkeye'
    });
  });
});

describe("JenkinsNotifier", function() {
  [null, ''].concat(Object.keys(commonBodies).map(function(field) {
    return commonBodies[field].build.status;
  })).forEach(function(oldState) {
    Object.keys(commonBodies).forEach(function(field) {
      it(field + " generic template", function() {
        var res = {
          status: function(code) { this.code = code; return this; },
          end: function(msg) { this.msg = msg; return this; },
        };

        jenkinsNotifier.statuses = {};
        jenkinsNotifier.statuses[commonBodies[field].name] = oldState;
        jenkinsNotifier.process({
          url: "/hubot/jenkins-notify?room=%23halkeye&onStart=FS&onFinished=FS",
          body: commonBodies[field]
        }, res);

        should(res.code).have.eql(200);
        should(res.msg).have.eql('');
      });
    });
  });
});

var test_data = [
  {
    "name": "finished-failed",
    "expected_out": ["JobName build #1 started failing: http://ci.jenkins.org/job/project name/5"],
    "body": commonBodies.FINISHED_FAILURE_fullURL
  }, {
    "name": "finished-failed-nofull_url",
    "expected_out": ["JobName build #1 started failing: job/project name/5"],
    "body": commonBodies.FINISHED_FAILURE
  }, {
    "name": "started",
    "expected_out": ["JobName build #2 started: http://ci.jenkins.org/job/project name/5"],
    "body": commonBodies.STARTED
  }, {
    "name": "started-with-previous-failed",
    "expected_out": ["JobName build #2 started: http://ci.jenkins.org/job/project name/5"],
    "previousBuildFailed": true,
    "body": commonBodies.STARTED
  }, {
    "name": "finished-with-previous-failed-default",
    "expected_out": ["JobName build #69 was restored: job/Jobname/69/"],
    "onFinished": "Fs",
    "previousBuildFailed": true,
    "body": commonBodies.FINALIZED_SUCCESS
  }
];
test_data.forEach(function(test) {
  describe(test.name, function() {
    //after(function() { this.room.destroy(); })
    before(function() {
      //this.room = scriptHelper.createRoom();
      this.notifier = new JenkinsNotifierRequest();
      if (test.previousBuildFailed) {
        this.notifier.setStatus("FAILURE");
      }
      this.notifier.setQuery(JenkinsNotifierRequest.buildQueryObject(
        '/hubot/jenkins-notify?room=%23halkeye&onStart=' + (test.onStart || 'FS') + '&onFinished=' + (test.onFinished || 'FS')
      ));
      this.messages = this.notifier.process(test.body);
    });
    it('Robot sent out respond', function() {
      should(this.messages).have.eql(test.expected_out);
    });
  });
});
