const { getRedisClient } = require('../config/redis');
const config = require('../config/server');
const { Question } = require('../models');

const set = async (key, value, ttl = config.cacheTTL) => {
  try {
    const client = getRedisClient();
    const serializedValue = JSON.stringify(value);
    await client.setEx(key, ttl, serializedValue);
    return true;
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error.message);
    return false;
  }
};

const get = async (key) => {
  try {
    const client = getRedisClient();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error.message);
    return null;
  }
};

const del = async (key) => {
  try {
    const client = getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error.message);
    return false;
  }
};

const clear = async () => {
  try {
    const client = getRedisClient();
    await client.flushDb();
    return true;
  } catch (error) {
    console.error('Cache clear error:', error.message);
    return false;
  }
};

const exists = async (key) => {
  try {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error(`Cache exists error for key ${key}:`, error.message);
    return false;
  }
};

const getCachedAnswer = async (question) => {
  const key = normalizeKey(question);
  const cached = await get(key);

  if (cached) {
    console.log(`Cache hit for: ${question.substring(0, 50)}...`);
    return cached;
  }

  // Also check database for recent identical questions
  const recentQuestion = await Question.findOne({
    question: { $regex: new RegExp(`^${question}$`, 'i') },
    askedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
  }).sort({ askedAt: -1 });

  if (recentQuestion && recentQuestion.answer) {
    console.log(`Database cache hit for: ${question.substring(0, 50)}...`);
    await set(key, { answer: recentQuestion.answer });
    return { answer: recentQuestion.answer };
  }

  return null;
};

const cacheAnswer = async (question, answer) => {
  const key = normalizeKey(question);
  await set(key, { answer });

  // Also cache similar questions
  await cacheSimilarQuestions(question, answer);
};

const cacheSimilarQuestions = async (question, answer) => {
  const words = question.toLowerCase().split(' ');
  if (words.length > 3) {
    // Cache variations of the question
    const variations = [
      words.slice(0, -1).join(' '), // Remove last word
      words.slice(1).join(' '), // Remove first word
      words.join(' ') + '?', // Ensure question mark
    ];

    variations.forEach(async (variation) => {
      if (variation.length > 5) {
        const key = normalizeKey(variation);
        await set(key, { answer }, 1800); // 30 minutes for variations
      }
    });
  }
};

const normalizeKey = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100);
};

module.exports = {
  set,
  get,
  del,
  clear,
  exists,
  getCachedAnswer,
  cacheAnswer,
};
