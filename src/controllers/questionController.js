const { Question, Answer } = require('../models');
const aiService = require('../services/aiService');
const cacheService = require('../services/cacheService');

const questionController = {
  askQuestion: async (req, res) => {
    try {
      const { question, category = 'general' } = req.body;

      // Start timing
      const startTime = Date.now();

      // Check cache first
      const cachedAnswer = await cacheService.getCachedAnswer(question);
      if (cachedAnswer) {
        const responseTime = Date.now() - startTime;

        // Save to database
        const savedQuestion = await questionController.saveQuestion(
          question,
          cachedAnswer.answer,
          'cache',
          responseTime,
          category,
        );

        return res.json({
          success: true,
          data: {
            question: savedQuestion.question,
            answer: cachedAnswer.answer,
            source: 'cache',
            responseTime,
            id: savedQuestion._id,
          },
        });
      }

      // Get from AI service
      const aiResult = await aiService.getAnswer(question);
      const responseTime = Date.now() - startTime;

      // Save to database
      const savedQuestion = await questionController.saveQuestion(
        question,
        aiResult.answer,
        aiResult.source,
        responseTime,
        category,
      );

      // Cache the result
      await cacheService.cacheAnswer(question, aiResult.answer);

      // Optimize answer for readability
      const optimizedAnswer = questionController.optimizeAnswer(aiResult.answer);

      res.json({
        success: true,
        data: {
          question: savedQuestion.question,
          answer: optimizedAnswer,
          source: aiResult.source,
          responseTime,
          id: savedQuestion._id,
        },
      });
    } catch (error) {
      console.error('Error asking question:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process question',
        message: error.message,
      });
    }
  },

  saveQuestion: async (question, answer, source, responseTime = 0, category = 'general') => {
    try {
      const newQuestion = new Question({
        question,
        answer,
        source,
        responseTime,
        category,
        isCached: source === 'cache',
      });

      // Determine difficulty
      const wordCount = question.split(' ').length;
      newQuestion.difficulty = wordCount < 5 ? 'easy' : wordCount > 10 ? 'hard' : 'medium';

      await newQuestion.save();

      // Save detailed answer if needed
      if (answer.length > 100) {
        await questionController.saveDetailedAnswer(newQuestion._id, answer);
      }

      return newQuestion;
    } catch (error) {
      console.error('Error saving question:', error);
      throw error;
    }
  },

  saveDetailedAnswer: async (questionId, answer) => {
    const keywords = answer.toLowerCase().match(/\b(\w+)\b/g) || [];
    const uniqueKeywords = [...new Set(keywords)].slice(0, 10);

    const detailedAnswer = new Answer({
      questionId,
      simplifiedAnswer: answer.substring(0, 200),
      detailedAnswer: answer,
      keywords: uniqueKeywords,
      confidence: 0.9,
    });

    await detailedAnswer.save();
  },

  getHistory: async (req, res) => {
    try {
      const { limit = 20, page = 1, category } = req.query;
      const skip = (page - 1) * limit;

      const query = category ? { category } : {};

      const questions = await Question.find(query)
        .sort({ askedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('question answer source responseTime category askedAt');

      const total = await Question.countDocuments(query);

      res.json({
        success: true,
        data: questions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch history',
      });
    }
  },

  searchQuestions: async (req, res) => {
    try {
      const { q, category } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Search query required',
        });
      }

      const searchQuery = {
        $text: { $search: q },
      };

      if (category) {
        searchQuery.category = category;
      }

      const questions = await Question.find(searchQuery)
        .limit(10)
        .select('question answer category');

      res.json({
        success: true,
        data: questions,
      });
    } catch {
      res.status(500).json({
        success: false,
        error: 'Search failed',
      });
    }
  },

  optimizeAnswer: (answer) => {
    // Remove markdown and special characters
    let optimized = answer.replace(/[#*_`]/g, '');

    // Simplify long sentences
    optimized = optimized.replace(/\s+/g, ' ');

    // Ensure answer ends with proper punctuation
    if (!/[.!?]$/.test(optimized)) {
      optimized += '.';
    }

    // Truncate if too long
    if (optimized.length > 500) {
      optimized = optimized.substring(0, 497) + '...';
    }

    return optimized.trim();
  },

  submitFeedback: async (req, res) => {
    try {
      const { id } = req.params;
      const { helpful, rating } = req.body;

      await Question.findByIdAndUpdate(id, {
        $push: {
          feedback: {
            helpful,
            rating,
            submittedAt: new Date(),
          },
        },
      });

      res.json({
        success: true,
        message: 'Feedback submitted',
      });
    } catch {
      res.status(500).json({
        success: false,
        error: 'Failed to submit feedback',
      });
    }
  },
};

module.exports = questionController;
