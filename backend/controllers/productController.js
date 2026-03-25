const { poolPromise, sql } = require('../database/db');

// Get all products
exports.getAllProducts = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Products');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create product
exports.createProduct = async (req, res) => {
    const { productName, description, unitId, criticalStockLevel } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ProductName', sql.NVarChar, productName)
            .input('Description', sql.NVarChar, description)
            .input('UnitID', sql.Int, unitId)
            .input('CriticalStockLevel', sql.Decimal(18, 2), criticalStockLevel)
            .query('INSERT INTO Products (ProductName, Description, UnitID, CriticalStockLevel) VALUES (@ProductName, @Description, @UnitID, @CriticalStockLevel)');
        res.status(201).json({ message: 'Product created successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const { productName, description, unitId, criticalStockLevel } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ProductID', sql.Int, id)
            .input('ProductName', sql.NVarChar, productName)
            .input('Description', sql.NVarChar, description)
            .input('UnitID', sql.Int, unitId)
            .input('CriticalStockLevel', sql.Decimal(18, 2), criticalStockLevel)
            .query('UPDATE Products SET ProductName = @ProductName, Description = @Description, UnitID = @UnitID, CriticalStockLevel = @CriticalStockLevel WHERE ProductID = @ProductID');
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ProductID', sql.Int, id)
            .query('DELETE FROM Products WHERE ProductID = @ProductID');
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
