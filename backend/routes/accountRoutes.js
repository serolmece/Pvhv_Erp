const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, accountController.getAllAccounts);
router.post('/', verifyToken, accountController.createAccount);

module.exports = router;
