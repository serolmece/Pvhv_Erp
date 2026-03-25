const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/', orderController.createOrder); // Create Order
router.get('/', orderController.getOrders); // List orders
router.get('/:id/items', orderController.getOrderItems); // Get order items
router.put('/:id/produce', orderController.completeProduction); // Complete overall production explicitly (bulk)
router.post('/:siparisId/production', orderController.addProductionRecord); // Add daily partial production
router.get('/:siparisId/production', orderController.getProductionRecords); // List production records for an order
router.put('/:siparisId/production/:uretimId', orderController.updateProductionRecord); // Update production record
router.delete('/:siparisId/production/:uretimId', orderController.deleteProductionRecord); // Delete production record

module.exports = router;
