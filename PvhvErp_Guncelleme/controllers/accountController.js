const { poolPromise } = require('../database/db');

exports.getAllAccounts = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Accounts ORDER BY AccountName');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createAccount = async (req, res) => {
    // Basic implementation if not exists, but likely covered by existing controller. 
    // Just ensuring we have getAllAccounts for the dropdown.
    res.status(501).json({ message: 'Not implemented here' });
};
// ... other methods
