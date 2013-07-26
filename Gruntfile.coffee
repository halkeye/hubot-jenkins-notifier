module.exports = (grunt)->
  'use strict'

  # Project configuration.
  grunt.initConfig
    pkg: grunt.file.readJSON('package.json')
    jshint:
      options:
        jshintrc: '.jshintrc'
      scripts:
        src: ['src/scripts/**/*.js']
      test:
        src: ['src/test/**/*.js']
    copy:
      main:
        files: [
            expand: true
            cwd: 'scripts/'
            src: ['**/*.js']
            dest: 'out/'
        ]
    coffeelint:
      gruntfile:
        src: 'Gruntfile.coffee'
      scripts:
        src: ['src/scripts/*.coffee']
      test:
        src: ['src/test/*.coffee']
      options:
        no_trailing_whitespace:
          level: 'error'
        max_line_length:
          level: 'warn'
    coffee:
      #compile:
      #  files:
      #    'out/scripts/vender.js': ['src/vendor/*.coffee']
      scripts:
        expand: true
        cwd: 'src/scripts/'
        src: ['**/*.coffee']
        dest: 'out/scripts/'
        ext: '.js'
      test:
        expand: true
        cwd: 'src/test/'
        src: ['**/*.coffee']
        dest: 'out/test/'
        ext: '.js'
    simplemocha:
      all:
        src: [
          'node_modules/should/lib/should.js'
          'out/test/**/*.js'
        ]
        options:
          globals: ['should']
          timeout: 3000
          ignoreLeaks: false
          #grep: '**/*.js'
          ui: 'bdd'
          reporter: 'tap'
    watch:
      gruntfile:
        files: '<%= coffeelint.gruntfile.src %>'
        tasks: ['coffeelint:gruntfile']
      jsLib:
        files: '<%= jshint.scripts.src %>'
        tasks: ['jshint:scripts', 'simplemocha']
      jsTest:
        files: '<%= jshint.test.src %>'
        tasks: ['jshint:test', 'simplemocha']
      coffeeLib:
        files: '<%= coffeelint.scripts.src %>'
        tasks: ['coffeelint:scripts', 'coffee:scripts', 'simplemocha']
      coffeeTest:
        files: '<%= coffeelint.test.src %>'
        tasks: ['coffeelint:test', 'coffee:test', 'simplemocha']
    clean: ['out/']

  # plugins.
  grunt.loadNpmTasks 'grunt-simple-mocha'
  grunt.loadNpmTasks 'grunt-coffeelint'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-copy'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-watch'

  # tasks.
  grunt.registerTask 'compile', [
    'coffeelint'
    'jshint'
    'copy'
    'coffee'
  ]

  grunt.registerTask 'default', [
    'compile'
    'simplemocha'
  ]

