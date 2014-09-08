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
#   POST /hubot/jenkins-notify?room=<room>[&type=<type>][&notstrat=<notificationStrategy>]
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
util = require('util')


class JenkinsNotifier
  constructor: (robot) ->
    @robot = robot
    @failing = []

  reset: ->
    @failing = []

  error: (err, body) ->
    console.log "jenkins-notify error: #{err.message}. Data: #{util.inspect(body)}"
    console.log err.stack

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

  dataMethodJSONParse: (req,data) ->
    return false if typeof req.body != 'object'

    # Remove __proto__ key from keys (newer node)
    ret = Object.keys(req.body).filter (val) ->
      val != '__proto__'

    # if there is only one key remaining then process that
    try
      if ret.length == 1
        return JSON.parse ret[0]
    catch err
      return false

    return false

  dataMethodRaw: (req) ->
    return false if typeof req.body != 'object'
    return req.body

  process: (req,res) ->
    query = querystring.parse(url.parse(req.url).query)

    res.end('')

    envelope = {notstrat:"Fs"}
    envelope.user = {}
    envelope.user.room = envelope.room = query.room if query.room
    envelope.notstrat = query.notstrat if query.notstrat
    envelope.notstrat = 'FS' if query.always_notify #legacy
    envelope.user.type = query.type if query.type

    data = null

    filterChecker = (item, callback) ->
      return if data

      ret = item(req)
      if (ret && ret.build)
        data = ret
        return true

    [@dataMethodJSONParse, @dataMethodRaw].forEach(filterChecker)

    if !data || typeof data.build != 'object'
      @error new Error("Unable to process data"), req.body
      return
    fullurl = data.build.full_url || data.build.url

    if data.build.phase in ['FINISHED', 'FINALIZED']
      if data.build.status == 'FAILURE'
        if data.name in @failing
          build = "is still"
        else
          build = "started"
        @robot.send envelope, "#{data.name} build ##{data.build.number} #{build} failing: #{fullurl}" if @shouldNotify(envelope.notstrat, data)
        @failing.push data.name unless data.name in @failing
      if data.build.status == 'SUCCESS'
        if data.name in @failing
          build = "was restored"
        else
          build = "succeeded"
        @robot.send envelope, "#{data.name} build ##{data.build.number} #{build}: #{fullurl}"  if @shouldNotify(envelope.notstrat, data)
        index = @failing.indexOf data.name
        @failing.splice index, 1 if index isnt -1

module.exports = (robot) ->
  robot.jenkins_notifier = new JenkinsNotifier robot

  robot.router.post "/hubot/jenkins-notify", (req, res) ->
    robot.jenkins_notifier.process req, res

