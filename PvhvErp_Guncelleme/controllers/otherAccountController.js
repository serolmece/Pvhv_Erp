const { poolPromise, sql } = require('../database/db');

exports.getOtherAccounts = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM DigerCariler ORDER BY Unvan ASC');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching other accounts:', err);
        res.status(500).json({ message: 'Diğer cariler alınamadı.' });
    }
};

exports.createOtherAccount = async (req, res) => {
    const { unvan, vkn, vergiDairesi, adres, iletisim, eposta } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Unvan', sql.NVarChar, unvan)
            .input('VergiNo', sql.NVarChar, vkn)
            .input('VergiDairesi', sql.NVarChar, vergiDairesi)
            .input('Adres', sql.NVarChar, adres)
            .input('Iletisim', sql.NVarChar, iletisim)
            .input('Eposta', sql.NVarChar, eposta)
            .query('INSERT INTO DigerCariler (Unvan, VergiNo, VergiDairesi, Adres, Iletisim, Eposta) VALUES (@Unvan, @VergiNo, @VergiDairesi, @Adres, @Iletisim, @Eposta)');
        res.status(201).json({ message: 'Cari oluşturuldu.' });
    } catch (err) {
        console.error('Error creating other account:', err);
        res.status(500).json({ message: 'Cari oluşturulamadı.' });
    }
};

exports.updateOtherAccount = async (req, res) => {
    const { id } = req.params;
    const { unvan, vkn, vergiDairesi, adres, iletisim, eposta } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('CariID', sql.Int, id)
            .input('Unvan', sql.NVarChar, unvan)
            .input('VergiNo', sql.NVarChar, vkn)
            .input('VergiDairesi', sql.NVarChar, vergiDairesi)
            .input('Adres', sql.NVarChar, adres)
            .input('Iletisim', sql.NVarChar, iletisim)
            .input('Eposta', sql.NVarChar, eposta)
            .query(`UPDATE DigerCariler 
                    SET Unvan = @Unvan, VergiNo = @VergiNo, VergiDairesi = @VergiDairesi, Adres = @Adres, Iletisim = @Iletisim, Eposta = @Eposta, GuncellemeTarihi = GETDATE()
                    WHERE CariID = @CariID`);
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Cari bulunamadı.' });
        }
        res.json({ message: 'Cari başarıyla güncellendi.' });
    } catch (err) {
        console.error('Error updating other account:', err);
        res.status(500).json({ message: 'Cari güncellenemedi.' });
    }
};

exports.deleteOtherAccount = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('CariID', sql.Int, id)
            .query('DELETE FROM DigerCariler WHERE CariID = @CariID');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Cari bulunamadı.' });
        }
        res.json({ message: 'Cari başarıyla silindi.' });
    } catch (err) {
        console.error('Error deleting other account:', err);
        res.status(500).json({ message: 'Cari silinemedi.' });
    }
};
