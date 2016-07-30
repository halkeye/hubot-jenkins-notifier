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
#     always_notify: always notify even on success
#     notstrat: Notification strategy, please see below
#     always_notify: always notify even on success
#     trace: trace the received JSON object
#
# Commands:
#   None
#
# URLS:
#   POST /hubot/jenkins-notify?room=<room>|user=<user>[&type=<type>][&notstrat=<notificationStrategy>][&always_notify=1][&trace=1]
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
    console.log "Jenkins Notifier Hubot script started. Awaiting requests."

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
    console.log "jenkins-notifier: Incoming request at #{req.url}"

    query = querystring.parse(url.parse(req.url).query)

    res.end('')

    envelope = {notstrat:"Fs"}
    envelope.user = {}
    
    envelope.notstrat = query.notstrat if query.notstrat
    envelope.notstrat = 'FS' if query.always_notify #legacy
    envelope.user.type = query.type if query.type

    if query.user && query.room
      console.log "Cannot use room and user together"
      return

    if query.user
      console.log "sending to user #{query.user}"
      envelope.user.user = query.user

    if query.room
      console.log "sending to room #{query.room}"
      envelope.user.room = envelope.room = query.room if query.room

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

    if query.trace
      console.log data.build

    fullurl = data.build.full_url || data.build.url

    if data.build.phase in ['COMPLETED']
      console.log "Ignoring phase COMPLETED"
      return

    if data.build.phase in ['STARTED']
      @robot.send envelope, "#{data.name} build ##{data.build.number} started: #{fullurl}"
    else
      console.log "#{data.name} #{data.build.phase} #{data.build.status}"
      
      if data.build.status == 'FAILURE'
        if data.name in @failing
          build = "is still"
        else
          build = "started"

        if @shouldNotify(envelope.notstrat, data)
            message = "#{data.name} build ##{data.build.number} #{build} failing: #{fullurl}"
            if data.build.log? && data.build.log.length != 0
              message = message + "\r\n" + data.build.log
            @robot.send envelope, message
        else
            console.log "Not sending message, not necessary"
        @failing.push data.name unless data.name in @failing
      if data.build.status == 'SUCCESS'
        if data.name in @failing
          build = "was restored"
        else
          build = "succeeded"

        if @shouldNotify(envelope.notstrat, data)
            @robot.send envelope, "#{data.name} build ##{data.build.number} #{build}: #{fullurl}"
        else
            console.log "Not sending message, not necessary"

        index = @failing.indexOf data.name
        @failing.splice index, 1 if index isnt -1

module.exports = (robot) ->
  robot.jenkins_notifier = new JenkinsNotifier robot

  robot.router.post "/hubot/jenkins-notify", (req, res) ->
    robot.jenkins_notifier.process req, res

