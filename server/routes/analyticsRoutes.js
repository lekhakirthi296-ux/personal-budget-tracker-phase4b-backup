const express = require('express');
const router = express.Router();
const { sendSuccess } = require('../utils/apiResponse');

// Phase 1 Route Stub
router.all('*', (req, res) => {
  return sendSuccess(res, 'Analytics API route initialized (Implementation scheduled for future phase)', null, 200);
});

module.exports = router;
