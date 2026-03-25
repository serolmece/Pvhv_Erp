const { poolPromise, sql } = require('../database/db');

// Get all suppliers
const getSuppliers = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Tedarikciler ORDER BY TedarikciAdi ASC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get single supplier by ID
const getSupplierById = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('TedarikciID', sql.Int, id)
            .query('SELECT * FROM Tedarikciler WHERE TedarikciID = @TedarikciID');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create new supplier
const createSupplier = async (req, res) => {
    let { TedarikciAdi, VergiNo, VergiDairesi, Eposta, Telefon, Adres } = req.body;

    // Sanitize VergiNo: Remove all spaces
    if (VergiNo) {
        VergiNo = VergiNo.replace(/\s+/g, '');
    }

    // Validation
    if (!TedarikciAdi) {
        return res.status(400).json({ message: 'Tedarikçi adı zorunludur.' });
    }
    // if (VergiNo && (VergiNo.length < 10 || VergiNo.length > 11)) {
    //     return res.status(400).json({ message: 'Vergi No 10 veya 11 haneli olmalıdır.' });
    // }

    try {
        const pool = await poolPromise;

        // Ensure unique Tax ID if provided (optional but good practice)
        if (VergiNo) {
            // Check exact match on sanitized ID
            const check = await pool.request()
                .input('VergiNo', sql.NVarChar, VergiNo)
                .query('SELECT TedarikciID FROM Tedarikciler WHERE VergiNo = @VergiNo');
            if (check.recordset.length > 0) {
                return res.status(400).json({ message: 'Bu Vergi No ile kayıtlı bir tedarikçi zaten mevcut.' });
            }
        }

        const result = await pool.request()
            .input('TedarikciAdi', sql.NVarChar, TedarikciAdi)
            .input('VergiNo', sql.NVarChar, VergiNo)
            .input('VergiDairesi', sql.NVarChar, VergiDairesi)
            .input('Eposta', sql.NVarChar, Eposta)
            .input('Telefon', sql.NVarChar, Telefon)
            .input('Adres', sql.NVarChar, Adres)
            .query(`
                INSERT INTO Tedarikciler (TedarikciAdi, VergiNo, VergiDairesi, Eposta, Telefon, Adres)
                OUTPUT INSERTED.*
                VALUES (@TedarikciAdi, @VergiNo, @VergiDairesi, @Eposta, @Telefon, @Adres)
            `);

        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update supplier
const updateSupplier = async (req, res) => {
    const { id } = req.params;
    let { TedarikciAdi, VergiNo, VergiDairesi, Eposta, Telefon, Adres } = req.body;

    // Sanitize VergiNo
    if (VergiNo) {
        VergiNo = VergiNo.replace(/\s+/g, '');
    }

    // if (VergiNo && (VergiNo.length < 10 || VergiNo.length > 11)) {
    //     return res.status(400).json({ message: 'Vergi No 10 veya 11 haneli olmalıdır.' });
    // }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('TedarikciID', sql.Int, id)
            .input('TedarikciAdi', sql.NVarChar, TedarikciAdi)
            .input('VergiNo', sql.NVarChar, VergiNo)
            .input('VergiDairesi', sql.NVarChar, VergiDairesi)
            .input('Eposta', sql.NVarChar, Eposta)
            .input('Telefon', sql.NVarChar, Telefon)
            .input('Adres', sql.NVarChar, Adres)
            .query(`
                UPDATE Tedarikciler 
                SET TedarikciAdi = @TedarikciAdi, 
                    VergiNo = @VergiNo, 
                    VergiDairesi = @VergiDairesi, 
                    Eposta = @Eposta, 
                    Telefon = @Telefon, 
                    Adres = @Adres,
                    GuncellemeTarihi = GETDATE()
                WHERE TedarikciID = @TedarikciID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        res.json({ message: 'Supplier updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete supplier
const deleteSupplier = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;

        // Check usage in StockMovements (StokHareketleri)
        const usageCheck = await pool.request()
            .input('CariID', sql.Int, id)
            .query('SELECT TOP 1 HareketID FROM StokHareketleri WHERE CariID = @CariID');

        if (usageCheck.recordset.length > 0) {
            return res.status(400).json({
                message: 'Bu tedarikçiye ait stok hareketleri bulunmaktadır. Silinemez.'
            });
        }

        const result = await pool.request()
            .input('TedarikciID', sql.Int, id)
            .query('DELETE FROM Tedarikciler WHERE TedarikciID = @TedarikciID');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        res.json({ message: 'Supplier deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get supplier history (Stock Movements)
const getSupplierHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('CariID', sql.Int, id)
            .query(`
                SELECT sh.*, s.UrunAdi, s.StokKodu
                FROM StokHareketleri sh
                LEFT JOIN StokKartlari s ON sh.StokID = s.StokID
                WHERE sh.CariID = @CariID
                ORDER BY sh.Tarih DESC
            `);
        // Note: Assuming 'StokKartlari' has 'UrunAdi' and 'StokKodu'. Adjust if needed based on schema.
        // Actually schema.sql usually has 'Products' but existing movements update script referenced 'StokKartlari'.
        // I will double check the table name for Products/StockCards.
        // update_schema_movements.sql referenced 'StokKartlari' and 'StokID'. So that is correct.

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierHistory
};
