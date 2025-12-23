const express = require('express');
const healthRoutes = require('./healthRoutes');
const questionController = require('../controllers/questionController');
const { validateQuestion, rateLimiter } = require('../middlewares');

const router = express.Router();

router.use('/health', healthRoutes);

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Assistance API',
    version: '1.0.0',
  });
});

// POST: Ask a question (HTTP endpoint)
router.post(
  '/ask',
  rateLimiter(15, 100), // 100 requests per 15 minutes
  validateQuestion,
  questionController.askQuestion,
);

// GET: Get answer history
router.get('/history', rateLimiter(15, 60), questionController.getHistory);

// GET: Search questions
router.get('/search', rateLimiter(15, 60), questionController.searchQuestions);

// POST: Feedback on answer quality
router.post('/feedback/:id', rateLimiter(15, 30), questionController.submitFeedback);

module.exports = router;
