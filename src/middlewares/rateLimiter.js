const rateLimit = require('express-rate-limit');

// Rate limiter middleware factory
const rateLimiter = (windowMs, max) => {
  return rateLimit({
    windowMs: windowMs * 60 * 1000, // windowMs minutes
    max: max, // limit each IP to max requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
};

module.exports = rateLimiter;
