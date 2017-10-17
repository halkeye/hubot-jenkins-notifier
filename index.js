var path = require('path');

module.exports = function (robot) {
  var scriptsPath = path.resolve(__dirname, 'src/scripts');
  return [
    robot.loadFile(scriptsPath, 'hubot-confluence-search.js')
  ];
};
