const validateQuestion = (req, res, next) => {
  const { question } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Question is required and must be a string',
    });
  }

  if (question.trim().length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Question must be at least 3 characters long',
    });
  }

  if (question.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'Question must be less than 500 characters',
    });
  }

  next();
};

module.exports = { validateQuestion };
