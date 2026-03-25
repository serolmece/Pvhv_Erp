const express = require('express');
const router = express.Router();
const stockCardController = require('../controllers/stockCardController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware'); // Assuming role based access

// Stock Card Routes
router.get('/', verifyToken, stockCardController.getAllStockCards);
router.post('/', verifyToken, stockCardController.createStockCard); // Add verifyRole(['Admin']) if needed
router.put('/:id', verifyToken, stockCardController.updateStockCard);
router.delete('/:id', verifyToken, stockCardController.deleteStockCard);

// Helpers
router.get('/categories', verifyToken, stockCardController.getCategories);
router.post('/categories', verifyToken, stockCardController.createCategory);
router.put('/categories/:id', verifyToken, stockCardController.updateCategory);
router.delete('/categories/:id', verifyToken, stockCardController.deleteCategory);
router.get('/generate-barcode', verifyToken, stockCardController.generateBarcode);

module.exports = router;
