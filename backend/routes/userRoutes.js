const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Get all users (Admin only)
router.get('/', verifyToken, verifyRole(['Admin']), userController.getUsers);

// Create user (Admin only)
router.post('/', verifyToken, verifyRole(['Admin']), userController.createUser);

// Update user (Admin only)
router.put('/:id', verifyToken, verifyRole(['Admin']), userController.updateUser);

// Delete user (Admin only)
router.delete('/:id', verifyToken, verifyRole(['Admin']), userController.deleteUser);

module.exports = router;
