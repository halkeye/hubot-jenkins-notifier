var fs = require('fs');
var path = require('path');

module.exports = function(robot) {
  var scripts_path = path.resolve(__dirname, 'src/scripts');
  return [
    robot.loadFile(scripts_path, 'hubot-confluence-search.js')
  ];
};
