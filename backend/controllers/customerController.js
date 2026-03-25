const { poolPromise, sql } = require('../database/db');

exports.getCustomers = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Musteriler ORDER BY Unvan ASC');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ message: 'Müşteriler alınamadı.' });
    }
};

exports.createCustomer = async (req, res) => {
    const { unvan, vkn, adres, iletisim } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Unvan', sql.NVarChar, unvan)
            .input('VKN', sql.NVarChar, vkn)
            .input('Adres', sql.NVarChar, adres)
            .input('Iletisim', sql.NVarChar, iletisim)
            .query('INSERT INTO Musteriler (Unvan, VKN, Adres, Iletisim) VALUES (@Unvan, @VKN, @Adres, @Iletisim)');
        res.status(201).json({ message: 'Müşteri oluşturuldu.' });
    } catch (err) {
        console.error('Error creating customer:', err);
        res.status(500).json({ message: 'Müşteri oluşturulamadı.' });
    }
};

exports.updateCustomer = async (req, res) => {
    const { id } = req.params;
    const { unvan, vkn, adres, iletisim } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('MusteriID', sql.Int, id)
            .input('Unvan', sql.NVarChar, unvan)
            .input('VKN', sql.NVarChar, vkn)
            .input('Adres', sql.NVarChar, adres)
            .input('Iletisim', sql.NVarChar, iletisim)
            .query(`UPDATE Musteriler 
                    SET Unvan = @Unvan, VKN = @VKN, Adres = @Adres, Iletisim = @Iletisim 
                    WHERE MusteriID = @MusteriID`);
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Müşteri bulunamadı.' });
        }
        res.json({ message: 'Müşteri başarıyla güncellendi.' });
    } catch (err) {
        console.error('Error updating customer:', err);
        res.status(500).json({ message: 'Müşteri güncellenemedi.' });
    }
};

exports.deleteCustomer = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;

        // Check if customer has orders
        const checkResult = await pool.request()
            .input('MusteriID', sql.Int, id)
            .query(`SELECT COUNT(*) AS OrderCount 
                    FROM MusteriSiparisleri 
                    WHERE MusteriID = @MusteriID`);

        if (checkResult.recordset[0].OrderCount > 0) {
            return res.status(400).json({ message: 'Bu müşteriye ait aktif siparişler veya reçeteler bulunduğu için silinemez.' });
        }

        const result = await pool.request()
            .input('MusteriID', sql.Int, id)
            .query('DELETE FROM Musteriler WHERE MusteriID = @MusteriID');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Müşteri bulunamadı.' });
        }
        res.json({ message: 'Müşteri başarıyla silindi.' });
    } catch (err) {
        console.error('Error deleting customer:', err);
        res.status(500).json({ message: 'Müşteri silinemedi.' });
    }
};
