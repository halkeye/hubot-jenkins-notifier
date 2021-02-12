const path = require('path');

module.exports = function (robot) {
  const scriptsPath = path.resolve(__dirname, 'src/scripts');
  return [
    robot.loadFile(scriptsPath, 'hubot-confluence-search.js')
  ];
};
