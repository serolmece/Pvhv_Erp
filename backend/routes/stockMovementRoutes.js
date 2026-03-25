const express = require('express');
const router = express.Router();
const stockMovementController = require('../controllers/stockMovementController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, stockMovementController.getAllMovements);
router.post('/', verifyToken, stockMovementController.createMovement);
router.get('/daily-stats', verifyToken, stockMovementController.getDailyStats);

module.exports = router;
