const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, invoiceController.getAllInvoices);
router.post('/', verifyToken, invoiceController.createInvoice);

module.exports = router;
