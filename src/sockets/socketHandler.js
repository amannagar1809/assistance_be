const logger = require('../utils/logger');
const aiService = require('../services/aiService');
const questionController = require('../controllers/questionController');

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('ask_question', async (data) => {
      const { question, sessionId } = data;

      // Emit processing status
      socket.emit('processing', { question, status: 'processing' });

      try {
        // Get answer from AI service
        const result = await aiService.getAnswer(question);

        // Stream answer character by character for real-time feel
        streamAnswer(socket, result.answer, sessionId);

        // Save to database
        await questionController.saveQuestion(question, result.answer, result.source);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });

    socket.on('message', (data) => {
      logger.debug(`Message from ${socket.id}:`, data);
      io.emit('message', {
        sender: socket.id,
        data,
        timestamp: new Date(),
      });
    });
  });
};

const streamAnswer = (socket, answer, sessionId) => {
  let index = 0;
  const streamInterval = global.setInterval(() => {
    if (index < answer.length) {
      socket.emit('answer_chunk', {
        chunk: answer[index],
        sessionId,
        isComplete: false,
      });
      index++;
    } else {
      socket.emit('answer_chunk', {
        chunk: '',
        sessionId,
        isComplete: true,
      });
      global.clearInterval(streamInterval);
    }
  }, 10); // 10ms between characters for smooth streaming
};

module.exports = {
  initializeSocket,
};
