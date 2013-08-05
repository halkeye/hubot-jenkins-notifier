# Description:
#   Notifies about Jenkins build errors via Jenkins Notification Plugin
#
# Dependencies:
#   None
#
# Configuration:
#   Make jenkins hit <HUBOT_URL>:<PORT>/hubot/jenkins-notify?room=<room>
#   See here: https://wiki.jenkins-ci.org/display/JENKINS/Notification+Plugin
#   Optional Params:
#     always_notify=1
#
# Commands:
#   None
#
# Notes:
#   Copyright (c) 2013 Gavin Mogan
#   Licensed under the MIT license.
#
# Author:
#   halkeye

'use strict'

url = require('url')
querystring = require('querystring')


class JenkinsNotifier
  constructor: (robot) ->
    @robot = robot
    @failing = []
  error: (e) ->
    console.log "jenkins-notify error: #{error}. Data: #{req.body}"
    console.log error.stack
  process: (req,res) ->
    query = querystring.parse(url.parse(req.url).query)

    res.end('')

    envelope = {}
    envelope.user = {}
    envelope.user.room = envelope.room = query.room if query.room
    envelope.user.type = query.type if query.type

    try
      # Newer versions of express/hubot already process posts that have Content-Type application/json
      for key of req.body
        data = JSON.parse key
    catch error
      try
        data = req.body
      catch error
        @error error
        return

    if data.build.phase == 'FINISHED'
      if data.build.status == 'FAILURE'
        if data.name in @failing
          build = "is still"
        else
          build = "started"
        @robot.send envelope, "We got fail: #{data.name} build ##{data.build.number} #{build} failing (#{encodeURI(data.build.full_url)})"
        @failing.push data.name unless data.name in @failing
      if data.build.status == 'SUCCESS'
        if data.name in @failing
          index = @failing.indexOf data.name
          @failing.splice index, 1 if index isnt -1
          @robot.send envelope, "Phew! All is well: #{data.name} build was restored ##{data.build.number} (#{encodeURI(data.build.full_url)})"
        else if query.always_notify
          @robot.send envelope, "Successful build: #{data.name} build was completed ##{data.build.number} (#{encodeURI(data.build.full_url)})"

module.exports = (robot) ->
  notifier = new JenkinsNotifier robot

  robot.router.post "/hubot/jenkins-notify", (req, res) ->
    notifier.process req, res

