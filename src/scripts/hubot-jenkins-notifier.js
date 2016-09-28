/*
# Notifies about Jenkins build errors via Jenkins Notification Plugin
#
# Dependencies:
#   "url": ""
#   "querystring": ""
#
# Configuration:
#   Make jenkins hit <HUBOT_URL>:<PORT>/hubot/jenkins-notify?room=<room>
#   or <HUBOT_URL>:<PORT>/hubot/jenkins-notify?user=<user>
#   Notification config. See here: https://wiki.jenkins-ci.org/display/JENKINS/Notification+Plugin
#   Optional Params:
#     onStart: Notification strategy for jobs starting, please see below
#     onFinished: Notification strategy for jobs finishing, please see below
#     trace: add a bunch of runtime console.log
#
# Commands:
#   None
#
# URLS:
#   POST /hubot/jenkins-notify?[room=<room>|user=<user>][&type=<type>][&onFinished=<notificationStrategy>][&onStart=<notificationStrategy>][&trace=1]
#
# Notes:
#   Copyright (c) 2013, 2016 Gavin Mogan
#   Licensed under the MIT license.
#
# Notification Strategy is [Ff][Ss] which stands for "Failure" and "Success"
# Capitalized letter means: notify always
# small letter means: notify only if buildstatus has changed
# "Fs" is the default
#
# Author:
#   halkeye
#   spajus
#   k9ert (notification strategy feature)
*/

'use strict'

var url = require('url');
var querystring = require('querystring');
var util = require('util');
var events = require('events');
var lodash = require('lodash');

var JenkinsNotifierRequest = function() {
  this.query = {};
  this.status = "";
  events.EventEmitter.call(this);
};
JenkinsNotifierRequest.prototype.__proto__ = events.EventEmitter.prototype;

JenkinsNotifierRequest.buildQueryObject = function(urlStr) {
  var query = querystring.parse(url.parse(urlStr).query);

  if (typeof query.onStart === 'undefined' && typeof query.onFinished === 'undefined') {
    if (query.notstrat) {
      query.onFinished = query.notstrat;
    } else if (query.always_notify) {
      query.onFinished = 'FS';
    } else {
      query.onFinished = 'Fs';
    }
  }

  query.onStart = query.onStart || '';
  query.onFinished = query.onFinished || '';

  delete query.notstrat;
  delete query.always_notify;
  return query;
}

JenkinsNotifierRequest.buildEnvelope = function(query) {
  var envelope = {
    user: {}
  };

  if (query.type) { envelope.user.type = query.type; }
  if (query.user && query.room) {
    throw new Error("Cannot use room (" + query.room + ") and user together (" + query.user + ")");
  }
  if (!query.user && !query.room) {
    throw new Error("Must use room or user parameter");
  }
  if (query.user) { envelope.user.user = query.user; }
  if (query.room) { envelope.user.room = envelope.room = query.room; }
  return envelope;
}

JenkinsNotifierRequest.prototype.setStatus = function(status) {
  this.status = status;
}

JenkinsNotifierRequest.prototype.getStatus = function() {
  return this.status;
}

JenkinsNotifierRequest.prototype.setQuery = function(q) {
  this.query = q;
}

JenkinsNotifierRequest.prototype.getQuery = function() {
  return this.query;
}

JenkinsNotifierRequest.prototype.logMessage = function(message) {
  if (this.query.trace || process.env.JENKINS_NOTIFIER_TRACE) {
     return console.log(message);
  }
}

JenkinsNotifierRequest.prototype.getFullUrl = function(data) {
  return data.build.full_url || data.build.url;
}

JenkinsNotifierRequest.prototype.processCompleted = function() {
  this.logMessage("Ignoring phase COMPLETED");
  return [];
}

JenkinsNotifierRequest.prototype.shouldNotify = function(data) {
  // Notification Strategy is [Ff][Ss] which stands for "Failure" and "Success"
  // Capitalized letter means: notify always
  // small letter means: notify only if buildstatus has changed
  
  if (data.build.phase === 'STARTED') {
    // last job was a failure 
    if (this.status === 'FAILURE') {
      if (/F/.test(this.query.onStart)) {
        return true;
      }
    }
    // last job was a success 
    if (this.status === 'SUCCESS') {
      if (/S/.test(this.query.onStart)) {
        return true;
      }
    }
    // unknown status, so output if any notification for start
    if (!this.status) {
      return !!this.query.onStart;
    }
  }

  if (data.build.status === 'FAILURE') {
    if (/F/.test(this.query.onFinished)) {
      return true
    }
    if (/f/.test(this.query.onFinished)) {
      return data.build.status !== this.status;
    }
  }

  if (data.build.status === 'SUCCESS') {
    if (/S/.test(this.query.onFinished)) {
      return true
    }
    if (/s/.test(this.query.onFinished)) {
      return data.build.status !== this.status;
    }
  }
  return false;
}

JenkinsNotifierRequest.prototype.processStarted = function(data) {
  this.emit('handleSuccess', data.name);
  if (this.shouldNotify(data)) {
    return [data.name + " build #" + data.build.number + " started: " + this.getFullUrl(data)];
  }
  return [];
}

JenkinsNotifierRequest.prototype.processFinished = JenkinsNotifierRequest.prototype.processFinalized = function(data) {
  var build;
  if (data.build.status === 'FAILURE') {
    build = "started";
    if (this.status === 'FAILURE') {
      build = "is still";
    }
    this.emit('handleFailed', data.name);

    if (this.shouldNotify(data)) {
      var message = data.name + " build #" + data.build.number + " " + build + " failing: " + this.getFullUrl(data);
      if (data.build.log) {
        message = message + "\r\n" + data.build.log;
      }
      return [message];
    } else {
      this.logMessage("Not sending message, not necessary");
    }
  }

  if (data.build.status === 'SUCCESS') {
    build = "succeeded";
    if (this.status === 'FAILURE') {
      build = "was restored";
    }
    this.emit('handleSuccess', data.name);

    if (this.shouldNotify(data)) {
      return [data.name + " build #" + data.build.number + " " + build + ": " + this.getFullUrl(data)];
    } else {
      this.logMessage("Not sending message, not necessary");
    }
  }

  return [];
}

JenkinsNotifierRequest.prototype.process = function(data) {
  /* if we have a handler, then handle it */
  var func = this['process' + lodash.upperFirst(data.build.phase.toLowerCase())];
  if (func) { return func.call(this, data); }
  return [];
}



/******************************************************/
var JenkinsNotifier = (function() {
  function JenkinsNotifier(robot) {
    this.robot = robot;
    this.statuses = {};
  }

  JenkinsNotifier.prototype.dataMethodJSONParse = function(req) {
    var ret;
    if (typeof req.body !== 'object') {
      return false;
    }
    ret = Object.keys(req.body).filter(function(val) {
      return val !== '__proto__';
    });
    try {
      if (ret.length === 1) {
        return JSON.parse(ret[0]);
      }
    } catch (_error) {
      return false;
    }
    return false;
  };

  JenkinsNotifier.prototype.dataMethodRaw = function(req) {
    if (typeof req.body !== 'object') {
      return false;
    }
    return req.body;
  };

  JenkinsNotifier.prototype.process = function(req, res) {
    var notifier = new JenkinsNotifierRequest();
    notifier.on('handleFailed', function(build) { this.statuses[build.name] = 'FAILURE'; }.bind(this));
    notifier.on('handleSuccess', function(build) { this.statuses[build.name] = 'SUCCESS'; }.bind(this));

    // FIXME - pretty sure we can now depend on express to process the body
    var body = this.dataMethodJSONParse(req);
    if (body === false) {
      body = this.dataMethodRaw(req);
    }

    try {
      if (!body || typeof body.build !== 'object') {
        throw new Error("Unable to process data - data empty or not an object");
      }
      notifier.setStatus(this.statuses[body.name]);
      notifier.setQuery(JenkinsNotifierRequest.buildQueryObject(req.url));
      notifier.logMessage("jenkins-notifier: Incoming request at " + req.url);
      notifier.logMessage(body.build);
      notifier.logMessage(body.name + " " + body.build.phase + " " + body.build.status);

      var messages = notifier.process(body);

      /* Send out all the messages */
      var envelope = JenkinsNotifierRequest.buildEnvelope(notifier.getQuery());
      lodash.forEach(messages, function(msg) {
        this.robot.send(envelope, msg);
      }.bind(this));

      res.status(200).end('');
    } catch (err) {
      console.log("jenkins-notify error: " + err.message + ". Data: " + (util.inspect(body)));
      console.log(err.stack);
      res.status(400).end(err.message);
    }
  };

  return JenkinsNotifier;

})();

module.exports = function(robot) {
  robot.jenkins_notifier = new JenkinsNotifier(robot);
  console.log("Jenkins Notifier Hubot script started. Awaiting requests.");

  robot.router.post("/hubot/jenkins-notify", function(req, res) {
    return robot.jenkins_notifier.process(req, res);
  });
  return robot.jenkins_notifier;
};
module.exports.JenkinsNotifierRequest = JenkinsNotifierRequest;
