//
// Notifies about Jenkins build errors via Jenkins Notification Plugin
//
// Configuration:
//   Make jenkins hit <HUBOT_URL>:<PORT>/hubot/jenkins-notify?room=<room>
//   or <HUBOT_URL>:<PORT>/hubot/jenkins-notify?user=<user>
//   Notification config. See here: https://wiki.jenkins-ci.org/display/JENKINS/Notification+Plugin
//   Optional Params:
//     onStart: Notification strategy for jobs starting, please see below
//     onFinished: Notification strategy for jobs finishing, please see below
//     trace: add a bunch of runtime console.log
//
// Commands:
//   None
//
// URLS:
//   POST /hubot/jenkins-notify?[room=<room>|user=<user>][&type=<type>][&onFinished=<notificationStrategy>][&onStart=<notificationStrategy>][&trace=1]
//
// Notes:
//   Copyright (c) 2013, 2016 Gavin Mogan
//   Licensed under the MIT license.
//
// Notification Strategy is [Ff][Ss] which stands for "Failure" and "Success"
// Capitalized letter means: notify always
// small letter means: notify only if buildstatus has changed
// "Fs" is the default
//
// Author:
//   halkeye
//   spajus
//   k9ert (notification strategy feature)

'use strict';

const util = require('util');
const EventEmitter = require('events').EventEmitter;

const ucFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const JenkinsNotifierRequest = function () {
  this.query = {};
  this.status = '';
  EventEmitter.call(this);
};
util.inherits(JenkinsNotifierRequest, EventEmitter);

JenkinsNotifierRequest.buildQueryObject = function (urlStr) {
  const parsed = new URL(urlStr, 'https://example.com');
  const query = Object.fromEntries(parsed.searchParams);

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
};

JenkinsNotifierRequest.buildEnvelope = function (query) {
  const envelope = {
    user: {}
  };

  if (query.type) { envelope.user.type = query.type; }
  if (query.user && query.room) {
    throw new Error('Cannot use room (' + query.room + ') and user together (' + query.user + ')');
  }
  if (!query.user && !query.room) {
    throw new Error('Must use room or user parameter');
  }
  if (query.user) { envelope.user.user = query.user; }
  if (query.room) { envelope.user.room = envelope.room = query.room; }
  return envelope;
};

JenkinsNotifierRequest.prototype.setStatus = function (status) {
  this.status = status;
};

JenkinsNotifierRequest.prototype.getStatus = function () {
  return this.status;
};

JenkinsNotifierRequest.prototype.setQuery = function (q) {
  this.query = q;
};

JenkinsNotifierRequest.prototype.getQuery = function () {
  return this.query;
};

JenkinsNotifierRequest.prototype.logMessage = function (message) {
  if (this.query.trace || process.env.JENKINS_NOTIFIER_TRACE) {
    return console.log(message);
  }
};

JenkinsNotifierRequest.prototype.getFullUrl = function (data) {
  return data.build.full_url || data.build.url;
};

JenkinsNotifierRequest.prototype.processCompleted = function () {
  this.logMessage('Ignoring phase COMPLETED');
  return [];
};

JenkinsNotifierRequest.prototype.shouldNotify = function (data) {
  // Notification Strategy is [Ff][Ss] which stands for "Failure" and "Success"
  // Capitalized letter means: notify always
  // small letter means: notify only if buildstatus has changed

  if (data.build.phase === 'STARTED') {
    // last job was a failure
    if (this.status === 'FAILURE' || this.status === 'UNSTABLE') {
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

  if (data.build.status === 'FAILURE' || data.build.status === 'UNSTABLE') {
    if (/F/.test(this.query.onFinished)) {
      return true;
    }
    if (/f/.test(this.query.onFinished)) {
      return data.build.status !== this.status;
    }
  }

  if (data.build.status === 'SUCCESS') {
    if (/S/.test(this.query.onFinished)) {
      return true;
    }
    if (/s/.test(this.query.onFinished)) {
      return data.build.status !== this.status;
    }
  }
  return false;
};

JenkinsNotifierRequest.prototype.processStarted = function (data) {
  this.emit('handleSuccess', data.name);
  if (this.shouldNotify(data)) {
    return [data.name + ' build #' + data.build.number + ' started: ' + this.getFullUrl(data)];
  }
  return [];
};

JenkinsNotifierRequest.prototype.processFinished = JenkinsNotifierRequest.prototype.processFinalized = function (data) {
  let build;
  if (data.build.status === 'FAILURE' || data.build.status === 'UNSTABLE') {
    build = 'started';
    if (this.status === 'FAILURE' || this.status === 'UNSTABLE') {
      build = 'is still';
    }
    this.emit('handleFailed', data.name);

    if (this.shouldNotify(data)) {
      let message = data.name + ' build #' + data.build.number + ' ' + build + ' failing: ' + this.getFullUrl(data);
      if (data.build.log) {
        message = message + '\r\n' + data.build.log;
      }
      return [message];
    } else {
      this.logMessage('Not sending message, not necessary');
    }
  }

  if (data.build.status === 'SUCCESS') {
    build = 'succeeded';
    if (this.status === 'FAILURE' || this.status === 'UNSTABLE') {
      build = 'was restored';
    }
    this.emit('handleSuccess', data.name);

    if (this.shouldNotify(data)) {
      return [data.name + ' build #' + data.build.number + ' ' + build + ': ' + this.getFullUrl(data)];
    } else {
      this.logMessage('Not sending message, not necessary');
    }
  }

  return [];
};

JenkinsNotifierRequest.prototype.process = function (data) {
  /* if we have a handler, then handle it */
  const func = this['process' + ucFirst(data.build.phase.toLowerCase())];
  if (func) { return func.call(this, data); }
  return [];
};

/******************************************************/
const JenkinsNotifier = (function () {
  function JenkinsNotifier (robot) {
    this.robot = robot;
    this.statuses = {};
  }

  JenkinsNotifier.prototype.dataMethodJSONParse = function (req) {
    if (typeof req.body !== 'object') {
      return false;
    }
    const ret = Object.keys(req.body).filter(function (val) {
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

  JenkinsNotifier.prototype.dataMethodRaw = function (req) {
    if (typeof req.body !== 'object') {
      return false;
    }
    return req.body;
  };

  JenkinsNotifier.prototype.process = function (req, res) {
    const notifier = new JenkinsNotifierRequest();
    notifier.on('handleFailed', function (build) { this.statuses[build.name] = 'FAILURE'; }.bind(this));
    notifier.on('handleSuccess', function (build) { this.statuses[build.name] = 'SUCCESS'; }.bind(this));

    // FIXME - pretty sure we can now depend on express to process the body
    let body = this.dataMethodJSONParse(req);
    if (body === false) {
      body = this.dataMethodRaw(req);
    }

    try {
      if (!body || typeof body.build !== 'object') {
        throw new Error('Unable to process data - data empty or not an object');
      }
      notifier.setStatus(this.statuses[body.name]);
      notifier.setQuery(JenkinsNotifierRequest.buildQueryObject(req.url));
      notifier.logMessage('jenkins-notifier: Incoming request at ' + req.url);
      notifier.logMessage(body.build);
      notifier.logMessage(body.name + ' ' + body.build.phase + ' ' + body.build.status);

      const messages = notifier.process(body);

      /* Send out all the messages */
      const envelope = JenkinsNotifierRequest.buildEnvelope(notifier.getQuery());
      Array.from(messages).forEach(function (msg) {
        this.robot.send(envelope, msg);
      }.bind(this));

      res.status(200).end('');
    } catch (err) {
      console.log('jenkins-notify error: ' + err.message + '. Data: ' + (util.inspect(body)));
      console.log(err.stack);
      res.status(400).end(err.message);
    }
  };

  return JenkinsNotifier;
})();

module.exports = function (robot) {
  robot.jenkins_notifier = new JenkinsNotifier(robot);
  // console.log('Jenkins Notifier Hubot script started. Awaiting requests.');

  robot.router.post('/hubot/jenkins-notify', function (req, res) {
    return robot.jenkins_notifier.process(req, res);
  });
  return robot.jenkins_notifier;
};
module.exports.JenkinsNotifierRequest = JenkinsNotifierRequest;
