const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 500,
    },
    answer: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ['openai', 'google', 'huggingface', 'duckduckgo', 'cache', 'fallback', 'generic'],
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sessionId: {
      type: String,
      trim: true,
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        trim: true,
        maxlength: 200,
      },
      submittedAt: Date,
    },
    responseTime: {
      type: Number, // in milliseconds
      default: null,
    },
    isCached: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
questionSchema.index({ question: 'text' });
questionSchema.index({ userId: 1, createdAt: -1 });
questionSchema.index({ sessionId: 1, createdAt: -1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ 'feedback.rating': 1 });

module.exports = mongoose.model('Question', questionSchema);
