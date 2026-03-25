const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/inventory', verifyToken, reportController.getInventoryReport);
router.get('/dashboard', verifyToken, reportController.getDashboardStats);
router.get('/export-excel', verifyToken, reportController.exportToExcel);

module.exports = router;
