module.exports = {
  port: process.env.PORT || 5000,
  host: process.env.HOST || 'localhost',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL || 'info',
  cacheTTL: parseInt(process.env.CACHE_TTL || '3600'),
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  apiKey: process.env.API_KEY || 'your_api_key',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};
