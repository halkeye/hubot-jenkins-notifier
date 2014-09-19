'use strict'
process.env.PORT = 0 # pick a random port for this test
Hubot = require('hubot')
Path = require('path')
request = require('supertest')
sinon = require('sinon')

adapterPath = Path.join Path.dirname(require.resolve 'hubot'), "src", "adapters"
robot = Hubot.loadBot adapterPath, "shell", true, "MochaHubot"

hubot_jenkins_notifier = require('../scripts/hubot-jenkins-notifier')(robot)

###
======== A Handy Little Mocha Reference ========
https://github.com/visionmedia/should.js
https://github.com/visionmedia/mocha

Mocha hooks:
  before ()-> # before describe
  after ()-> # after describe
  beforeEach ()-> # before each it
  afterEach ()-> # after each it

Should assertions:
  should.exist('hello')
  should.fail('expected an error!')
  true.should.be.ok
  true.should.be.true
  false.should.be.false

  (()-> arguments)(1,2,3).should.be.arguments
  [1,2,3].should.eql([1,2,3])
  should.strictEqual(undefined, value)
  user.age.should.be.within(5, 50)
  username.should.match(/^\w+$/)

  user.should.be.a('object')
  [].should.be.an.instanceOf(Array)

  user.should.have.property('age', 15)

  user.age.should.be.above(5)
  user.age.should.be.below(100)
  user.pets.should.have.length(5)

  res.should.have.status(200) #res.statusCode should be 200
  res.should.be.json
  res.should.be.html
  res.should.have.header('Content-Length', '123')

  [].should.be.empty
  [1,2,3].should.include(3)
  'foo bar baz'.should.include('foo')
  { name: 'TJ', pet: tobi }.user.should.include({ pet: tobi, name: 'TJ' })
  { foo: 'bar', baz: 'raz' }.should.have.keys('foo', 'bar')

  (()-> throw new Error('failed to baz')).should.throwError(/^fail.+/)

  user.should.have.property('pets').with.lengthOf(4)
  user.should.be.a('object').and.have.property('name', 'tj')
###

test_data = [
  {
    "name": "finished-failed",
    "expected_out": "JobName build #1 started failing: http://ci.jenkins.org/job/project name/5",
    "body": {
      "name":"JobName",
      "url":"JobUrl",
      "build":{
        "number":1,
        "phase":"FINISHED",
        "status":"FAILURE",
        "url":"job/project%20name/5",
        "full_url":"http://ci.jenkins.org/job/project%20name/5"
        "parameters":{"branch":"master"}
      }
    }
  },
  {
    "name": "finished-failed-nofull_url",
    "expected_out": "JobName build #1 started failing: job/project name/5",
    "body": {
      "name":"JobName",
      "url":"JobUrl",
      "build":{
        "number":1,
        "phase":"FINISHED",
        "status":"FAILURE",
        "url":"job/project%20name/5",
        "parameters":{"branch":"master"}
      }
    }
  },
  {
    "name": "started-failed",
    "expected_out": false,
    "body": {
      "name":"JobName",
      "url":"JobUrl",
      "build":{
        "number":2,
        "phase":"STARTED",
        "status":"FAILED",
        "url":"job/project%20name/5",
        "full_url":"http://ci.jenkins.org/job/project%20name/5"
        "parameters":{"branch":"master"}
      }
    }
  },
  {
    "name": "started-finalized",
    "expected_out": false,
    "body": {
      "name":"JobName",
      "url":"JobUrl",
      "build":{
        "number":2,
        "phase":"STARTED",
        "status":"FINALIZED",
        "url":"job/project%20name/5",
        "full_url":"http://ci.jenkins.org/job/project%20name/5"
        "parameters":{"branch":"master"}
      }
    }
  }
]

urls = {
  'new' : "/hubot/jenkins-notify?room=%23halkeye&always_notify=1",
  'old' : "/hubot/jenkins-notify?room=%23halkeye&notstrat=FS"
}

for test in test_data then do (test) ->
  for url_type,url of urls then do (url_type, url) ->
    describe test.name + '-' + url_type, ()->
      before (done) ->
        robot.jenkins_notifier.reset()
        robot.adapter.send = sinon.spy()
        endfunc = (err, res) ->
          throw err if err
          do done
        request(robot.router)
          .post(url)
          .send(JSON.stringify(test.body))
          .expect(200)
          .end(endfunc)
      it 'Robot sent out respond', ()->
        if test.expected_out == false
          robot.adapter.send.called.should.be.false
        else
          robot.adapter.send.called.should.be.true
      it 'Robot sent to right room', ()->
        if test.expected_out == false
          # previous test will test this
        else
          send_arg = robot.adapter.send.getCall(0).args[0]
          send_arg.user.room.should.eql '#halkeye'
          send_arg.room.should.eql '#halkeye'
      it 'Robot sent right message', ()->
        if test.expected_out == false
          # previous test will test this
        else
          robot.adapter.send.getCall(0).args[1].should.eql test.expected_out

