const logger = require('../utils/logger');

const errorMiddleware = (error, req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  logger.error(`${req.method} ${req.path} - Error: ${message}`);

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

module.exports = errorMiddleware;
