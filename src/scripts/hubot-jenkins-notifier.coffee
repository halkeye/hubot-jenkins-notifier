# Notifies about Jenkins build errors via Jenkins Notification Plugin
#
# Dependencies:
#   "url": ""
#   "querystring": ""
#
# Configuration:
#   Make jenkins hit <HUBOT_URL>:<PORT>/hubot/jenkins-notify?room=<room>
#   Notification config. See here: https://wiki.jenkins-ci.org/display/JENKINS/Notification+Plugin
#   Optional Params:
#     always_notify=1
#
# Commands:
#   None
#
# URLS:
#   POST /hubot/jenkins-notify?room=<room>[&type=<type>][&notstrat=<notificationSTrategy>]
#
# Notes:
#   Copyright (c) 2013 Gavin Mogan
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

  shouldNotify: (notstrat, data) ->
    if data.build.status == 'FAILURE'
      if /F/.test(notstrat)
        return true
      return @buildStatusChanged(data, @failing)
    if data.build.status == 'SUCCESS'
      if /S/.test(notstrat)
        return true
      return @buildStatusChanged(data, @failing)

  buildStatusChanged: (data) ->
    if data.build.status == 'FAILURE' and data.name in @failing
      return false
    if data.build.status == 'FAILURE' and not (data.name in @failing)
      return true
    if data.build.status == 'SUCCESS' and data.name in @failing
      return true
    if data.build.status == 'SUCCESS' and not (data.name in @failing)
      return false
    console.log "this should not happen"

  process: (req,res) ->
    query = querystring.parse(url.parse(req.url).query)

    res.end('')

    envelope = {notstrat:"Fs"}
    envelope.user = {}
    envelope.user.room = envelope.room = query.room if query.room
    envelope.notstrat = query.notstrat if query.notstrat
    envelope.notstrat = 'FS' if query.always_notify #legacy
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
        @robot.send envelope, "#{data.name} build ##{data.build.number} #{build} failing (#{encodeURI(data.build.full_url)})" if @shouldNotify(envelope.notstrat, data)
        @failing.push data.name unless data.name in @failing
      if data.build.status == 'SUCCESS'
        if data.name in @failing
          build = "was restored"
        else
          build = "succeeded"
        @robot.send envelope, "#{data.name} build ##{data.build.number} #{build} (#{encodeURI(data.build.full_url)})"  if @shouldNotify(envelope.notstrat, data)
        index = @failing.indexOf data.name
        @failing.splice index, 1 if index isnt -1

module.exports = (robot) ->
  notifier = new JenkinsNotifier robot

  robot.router.post "/hubot/jenkins-notify", (req, res) ->
    notifier.process req, res

