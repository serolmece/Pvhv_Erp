const express = require('express');
const router = express.Router();
const multer = require('multer');
const invoiceImportController = require('../controllers/invoiceImportController');
const path = require('path');
const fs = require('fs');

// Configure Multer
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// Routes
router.post('/upload', upload.single('invoiceFile'), invoiceImportController.processInvoice);
router.post('/save', invoiceImportController.saveInvoice);

module.exports = router;
