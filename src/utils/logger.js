const config = require('../config/server');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const levelNames = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'DEBUG',
};

const currentLevel = levels[config.logLevel] || 2;

const log = (level, message, data = null) => {
  if (levels[level] <= currentLevel) {
    const timestamp = new Date().toISOString();
    const levelName = levelNames[levels[level]];
    const logEntry = `[${timestamp}] [${levelName}] ${message}`;

    if (data) {
      console.log(logEntry, data);
    } else {
      console.log(logEntry);
    }
  }
};

const error = (message, data = null) => log('error', message, data);
const warn = (message, data = null) => log('warn', message, data);
const info = (message, data = null) => log('info', message, data);
const debug = (message, data = null) => log('debug', message, data);

module.exports = {
  error,
  warn,
  info,
  debug,
};
