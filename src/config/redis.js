const { createClient } = require('redis');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = createClient({
      url:
        process.env.REDIS_URL ||
        'redis://default:Twl5qGCJG2dHKD1PSpem9o7NBAoURJTV@redis-18703.c114.us-east-1-4.ec2.cloud.redislabs.com:18703',
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Redis retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      },
    });

    redisClient.on('connect', () => {
      console.log('Redis Connected');
    });

    redisClient.on('error', (error) => {
      console.error(`Redis Errors: ${error.message}`);
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error(`Error connecting to Redis: ${error.message}`);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

const disconnectRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      console.log('Redis Disconnected');
    }
  } catch (error) {
    console.error(`Error disconnecting from Redis: ${error.message}`);
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis,
};
