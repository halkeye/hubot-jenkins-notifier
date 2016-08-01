# hubot-jenkins-notifier

[![Build Status](https://travis-ci.org/halkeye/hubot-jenkins-notifier.png?branch=master)](https://travis-ci.org/halkeye/hubot-jenkins-notifier)
[![Dependency Status](https://gemnasium.com/halkeye/hubot-jenkins-notifier.png)](https://gemnasium.com/halkeye/hubot-jenkins-notifier)

Notifies about Jenkins build errors via [Jenkins Notification Plugin](https://wiki.jenkins-ci.org/display/JENKINS/Notification+Plugin)

## Getting Started
1. Install the module: `npm install --save hubot-jenkins-notifier`
2. Add it `hubot-jenkins-notifier` to your external-scripts.json file in your hubot directory
3. Add hubot's endpoint to jenkins jobs: (see Screenshot)
 1. Configure it to be JSON, HTTP and either "All events", "Job started" or "Job finalized". "Job completed" will be ignored.
 2. To send to a room: `http://<hubot-host>:<hubot-port>/hubot/jenkins-notify?room=<room>` 
 3. To send to a user: `http://<hubot-host>:<hubot-port>/hubot/jenkins-notify?user=<username>` 
 4. Add log lines if you want to

### Screenshot
![Jenkins Notifier Plugin Config Screenshot](jenkins-notifier-screenshot.png)

## Configuration
As url parameters the following can be used:

* `room`: The room name to send the message to. Mutually exlusive with `user`
* `user`: The user name to send the private message to. Mutually exlusive with `room`
* `always_notify`: always notify even on success
* `notstrat`: Notification strategy: [Ff][Ss] which stands for "Failure" and "Success". Capitalized letter means: notify always. Small letter means: notify only if buildstatus has changed
  "Fs" is the default
* `trace`: enable tracing for diagnostics

Environment variable:

* JENKINS_NOTIFIER_TRACE: set this environment variable to 1 to enable tracing for diagnostics

## Release History

0.2.0 - 2016-07-30

* Added parameter `user`, `trace`
* Updated documentation to reflect changes in jenkins notification plugin
* Added traces and logs

0.1.5 - 2014-09-18

* Tweak configs to work with newer versions of npm / fix for travis-ci
* Support jenkins 1.577 (Now passes FINALIZED instead of FINISHED) - [Jenkins Notifier Commit](https://github.com/jenkinsci/notification-plugin/commit/2af09e3002ff887a5eaa7577b190f1cbb9c123e3)

0.1.4 - 2014-02-23

* Brought in recent changes from [github/hubot-scripts](http://www.github.com/github/hubot-scripts)
* Upgraded json parsing to handle/fail gracefully
* Handle jenkins not providing full url (for now not handled well, but better than undefined)
* Added screenshots to configuration

0.1.3 - 2013-08-05

* support hubot-irc adapter

0.1.2 - 2013-07-23

* allow `always_notify=1` cgi parameter to always notify a room even on success

0.1.1 - 2013-07-22

* Fixed up .npmignore file so the proper files were being packaged up

0.1.0 - Initial Release - 2013-07-20

* Based heavily on the [github/hubot-scripts](http://www.github.com/github/hubot-scripts) version which broke in our infrastructure

## License
Copyright (c) 2013 Gavin Mogan
Licensed under the MIT license.

