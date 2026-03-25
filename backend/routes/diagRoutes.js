const express = require('express');
const router = express.Router();
const { poolPromise } = require('../database/db');
const bcrypt = require('bcryptjs');

router.get('/test-bcrypt', async (req, res) => {
    try {
        console.log("Testing bcryptjs...");
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash("test1234", salt);
        const match = await bcrypt.compare("test1234", hash);
        res.json({ salt, hash, match, message: "BcryptJS is working correctly!" });
    } catch (err) {
        console.error("BcryptJS Test Error:", err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

router.get('/test-db', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT GETDATE() as now, DB_NAME() as db');
        res.json({ db: result.recordset[0], message: "DB is working correctly!" });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

module.exports = router;
