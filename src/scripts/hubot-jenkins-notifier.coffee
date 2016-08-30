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
#
# Sample data sent from Jenkins plugin for job "jobname":
# STARTED:
#
#{ name: 'jobname',
#  url: 'job/jobname/',
#  build:
#  { number: 5,
#    queue_id: 5,
#    phase: 'STARTED',
#    url: 'job/jobname/5/',
#    scm: {},
#    log: '',
#    artifacts: {} } }
#
# COMPLETED
#
#{ name: 'jobname',
#  url: 'job/jobname/',
#  build:
#  { number: 5,
#    queue_id: 5,
#    phase: 'COMPLETED',
#    status: 'SUCCESS',
#    url: 'job/jobname/5/',
#    scm: {},
#    log: '',
#    artifacts: {} } }
#
# FINALIZED
#
#{ name: 'jobname',
#  url: 'job/jobname/',
#  build:
#  { number: 5,
#    queue_id: 5,
#    phase: 'FINALIZED',
#    status: 'SUCCESS',
#    url: 'job/jobname/5/',
#    scm: {},
#    log: '',
#    artifacts: {} } }

'use strict'

url = require('url')
querystring = require('querystring')
util = require('util')


class JenkinsNotifier
  constructor: (robot) ->
    @robot = robot
    @failing = []
    @logMessage(undefined, "Jenkins Notifier Hubot script started. Awaiting requests.")

  reset: ->
    @failing = []

  storeAsFailed: (name) ->
    @failing.push name unless name in @failing

  error: (err, body) ->
    console.log "jenkins-notify error: #{err.message}. Data: #{util.inspect(body)}"
    console.log err.stack

  logMessage: (traceQueryParam, message) ->
    if (traceQueryParam? && traceQueryParam) || (process.env.JENKINS_NOTIFIER_TRACE && process.env.JENKINS_NOTIFIER_TRACE)
      console.log message

  shouldNotify: (notstrat, data) ->
    if data.build.phase == 'STARTED'
      if /F/.test(notstrat)
        return true
      return @lastBuildFailed(data, @failing)
    if data.build.status == 'FAILURE'
      if /F/.test(notstrat)
        return true
      return @buildStatusChanged(data, @failing)
    if data.build.status == 'SUCCESS'
      if /S/.test(notstrat)
        return true
      return @buildStatusChanged(data, @failing)

  lastBuildFailed: (data) ->
    return data.name in @failing

  lastBuildSucceeded: (data) ->
    return not @lastBuildFailed(data, @failing)

  buildStatusChanged: (data) ->
    if data.build.status == 'FAILURE' and @lastBuildFailed(data, @failing)
      return false
    if data.build.status == 'FAILURE' and @lastBuildSucceeded(data, @failing)
      return true
    if data.build.status == 'SUCCESS' and @lastBuildFailed(data, @failing)
      return true
    if data.build.status == 'SUCCESS' and @lastBuildSucceeded(data, @failing)
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

  process: (req, res) ->
    @logMessage(undefined, "jenkins-notifier: Incoming request at #{req.url}")

    query = querystring.parse(url.parse(req.url).query)

    envelope = {notstrat:"Fs"}
    envelope.user = {}
    
    envelope.notstrat = query.notstrat if query.notstrat
    envelope.notstrat = 'FS' if query.always_notify #legacy
    envelope.user.type = query.type if query.type

    if query.user && query.room
      console.log "Cannot use room (#{query.room}) and user together (#{query.user})"
      res.status(400).end()
      return

    if !query.user && !query.room
      console.log "Must use room or user parameter"
      res.status(400).end()
      return

    res.end('')

    if query.user
      @logMessage(query.trace, "sending to user #{query.user}")
      envelope.user.user = query.user

    if query.room
      @logMessage(query.trace, "sending to room #{query.room}")
      envelope.user.room = envelope.room = query.room

    data = null

    filterChecker = (item, callback) ->
      return if data

      ret = item(req)
      if (ret && ret.build)
        data = ret
        return true

    [@dataMethodJSONParse, @dataMethodRaw].forEach(filterChecker)

    if !data || typeof data.build != 'object'
      @error new Error("Unable to process data - data empty or not an object"), req.body
      return

    @logMessage(query.trace, data.build)

    fullurl = data.build.full_url || data.build.url

    if data.build.phase in ['COMPLETED']
      @logMessage(query.trace, "Ignoring phase COMPLETED")
      return

    @logMessage(query.trace, "#{data.name} #{data.build.phase} #{data.build.status}")

    if data.build.phase in ['STARTED']
      if @shouldNotify(envelope.notstrat, data)
        @robot.send envelope, "#{data.name} build ##{data.build.number} started: #{fullurl}"
      return

    if data.build.phase in ['FINISHED', 'FINALIZED']
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
          @logMessage(query.trace, "Not sending message, not necessary")
        @storeAsFailed(data.name)

      if data.build.status == 'SUCCESS'
        if data.name in @failing
          build = "was restored"
        else
          build = "succeeded"

        if @shouldNotify(envelope.notstrat, data)
          @robot.send envelope, "#{data.name} build ##{data.build.number} #{build}: #{fullurl}"
        else
          @logMessage(query.trace, "Not sending message, not necessary")

        index = @failing.indexOf data.name
        @failing.splice index, 1 if index isnt -1

module.exports = (robot) ->
  robot.jenkins_notifier = new JenkinsNotifier robot

  robot.router.post "/hubot/jenkins-notify", (req, res) ->
    robot.jenkins_notifier.process req, res

