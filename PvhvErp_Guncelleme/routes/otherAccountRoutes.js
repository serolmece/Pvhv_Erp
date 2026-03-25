const express = require('express');
const router = express.Router();
const otherAccountController = require('../controllers/otherAccountController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, otherAccountController.getOtherAccounts);
router.post('/', verifyToken, otherAccountController.createOtherAccount);
router.put('/:id', verifyToken, otherAccountController.updateOtherAccount);
router.delete('/:id', verifyToken, otherAccountController.deleteOtherAccount);

module.exports = router;
