const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    simplifiedAnswer: {
      type: String,
      default: '',
    },
    detailedAnswer: {
      type: String,
      default: '',
    },
    keywords: [
      {
        type: String,
      },
    ],
    sources: [
      {
        type: String,
      },
    ],
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    language: {
      type: String,
      default: 'english',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Answer', answerSchema);
