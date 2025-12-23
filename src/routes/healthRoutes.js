const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
  });
});

router.get('/live', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'alive',
  });
});

module.exports = router;
