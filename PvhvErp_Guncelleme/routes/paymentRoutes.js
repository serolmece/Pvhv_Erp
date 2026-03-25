const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Tekil ve Periyodik Ödeme ekleme
router.post('/single', paymentController.createPayment);
router.post('/periodic', paymentController.createPeriodicPayments);

// Ödemeleri Listele
router.get('/', paymentController.getPayments);

// Ödemeyi "Ödendi" Olarak İşaretle (Cari bakiye düşür)
// IIS WebDAV modülüne takılmamak için PUT ve DELETE yerine POST metodları kullanıyoruz
router.post('/:id/pay', paymentController.markAsPaid);

// Ödemeyi Sil
router.post('/:id/delete', paymentController.deletePayment);

// Ödemeyi Güncelle
router.post('/:id/update', paymentController.updatePayment);

module.exports = router;
