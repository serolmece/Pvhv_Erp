const { poolPromise, sql } = require('../database/db');

// Get invoices
exports.getAllInvoices = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT i.*, a.AccountName 
            FROM Invoices i
            JOIN Accounts a ON i.AccountID = a.AccountID
            ORDER BY i.InvoiceDate DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create invoice
exports.createInvoice = async (req, res) => {
    const { accountId, invoiceNumber, invoiceDate, dueDate, totalAmount, invoiceType, description } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('AccountID', sql.Int, accountId)
            .input('InvoiceNumber', sql.NVarChar, invoiceNumber)
            .input('InvoiceDate', sql.Date, invoiceDate)
            .input('DueDate', sql.Date, dueDate)
            .input('TotalAmount', sql.Decimal(18, 2), totalAmount)
            .input('InvoiceType', sql.NVarChar, invoiceType)
            .input('Description', sql.NVarChar, description)
            .query('INSERT INTO Invoices (AccountID, InvoiceNumber, InvoiceDate, DueDate, TotalAmount, InvoiceType, Description) VALUES (@AccountID, @InvoiceNumber, @InvoiceDate, @DueDate, @TotalAmount, @InvoiceType, @Description)');
        res.status(201).json({ message: 'Invoice created successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
