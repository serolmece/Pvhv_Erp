const { poolPromise } = require('../database/db');
const sql = require('mssql');

// Bütün ödemeleri getir (Takvim, Liste vb için)
exports.getPayments = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT p.*, 
                   CASE 
                     WHEN p.CariTipi = 'Musteri' THEN m.Unvan 
                     WHEN p.CariTipi = 'Tedarikci' THEN t.TedarikciAdi
                     WHEN p.CariTipi = 'Diger' THEN d.Unvan
                     ELSE 'Bilinmiyor'
                   END as CariAdi
            FROM Odemeler p
            LEFT JOIN Musteriler m ON p.CariID = m.MusteriID AND p.CariTipi = 'Musteri'
            LEFT JOIN Tedarikciler t ON p.CariID = t.TedarikciID AND p.CariTipi = 'Tedarikci'
            LEFT JOIN DigerCariler d ON p.CariID = d.CariID AND p.CariTipi = 'Diger'
            ORDER BY p.VadeTarihi ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ödemeler getirilirken hata oluştu.' });
    }
};

// Yeni tekil ödeme ekle
exports.createPayment = async (req, res) => {
    const { cariId, cariTipi, tutar, dovizTipi, konu, vadeTarihi } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('cariId', sql.Int, cariId)
            .input('cariTipi', sql.VarChar, cariTipi || 'Musteri')
            .input('tutar', sql.Decimal(18, 2), tutar)
            .input('dovizTipi', sql.VarChar, dovizTipi || 'TL')
            .input('konu', sql.NVarChar, konu)
            .input('vadeTarihi', sql.Date, vadeTarihi)
            .query(`
                INSERT INTO Odemeler (CariID, CariTipi, Tutar, DovizTipi, Konu, VadeTarihi, OdendiMi)
                VALUES (@cariId, @cariTipi, @tutar, @dovizTipi, @konu, @vadeTarihi, 0)
            `);
        res.status(201).json({ message: 'Ödeme eklendi.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ödeme eklerken hata oluştu.' });
    }
};

// Periyodik ödeme ekle (Belirtilen tekrar sayısı kadar ileri tarihlere Odemeler satırı ekler)
exports.createPeriodicPayments = async (req, res) => {
    const { cariId, cariTipi, tutar, dovizTipi, konu, baslangicTarihi, tekrarGunu, tekrarSayisi } = req.body;
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // PeriyodikAyarlar Tablosuna Kaydet
            await transaction.request()
                .input('cariId', sql.Int, cariId)
                .input('cariTipi', sql.VarChar, cariTipi || 'Musteri')
                .input('tutar', sql.Decimal(18, 2), tutar)
                .input('dovizTipi', sql.VarChar, dovizTipi || 'TL')
                .input('konu', sql.NVarChar, konu)
                .input('baslangicTarihi', sql.Date, baslangicTarihi)
                .input('tekrarGunu', sql.Int, tekrarGunu)
                .input('tekrarSayisi', sql.Int, tekrarSayisi)
                .query(`
                    INSERT INTO PeriyodikAyarlar (CariID, CariTipi, Tutar, DovizTipi, Konu, BaslangicTarihi, TekrarGunu, TekrarSayisi)
                    VALUES (@cariId, @cariTipi, @tutar, @dovizTipi, @konu, @baslangicTarihi, @tekrarGunu, @tekrarSayisi)
                `);

            // Belirlenen ay kadar Odemeler tablosuna eklemeler yap (Başlangıç ayından itibaren)
            const startDate = new Date(baslangicTarihi);

            for (let i = 0; i < tekrarSayisi; i++) {
                // i ay sonrasını hesapla, günü tekrarGunu yap. (Eğer ayda o gün yoksa örn: 31 şubat, Date objesi mart ayına sarkaçlayacaktır, basitleştirme adına geçerli)
                const paymentDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, tekrarGunu);

                await transaction.request()
                    .input('cariId', sql.Int, cariId)
                    .input('cariTipi', sql.VarChar, cariTipi || 'Musteri')
                    .input('tutar', sql.Decimal(18, 2), tutar)
                    .input('dovizTipi', sql.VarChar, dovizTipi || 'TL')
                    .input('konu', sql.NVarChar, konu)
                    .input('vadeTarihi', sql.Date, paymentDate)
                    .query(`
                        INSERT INTO Odemeler (CariID, CariTipi, Tutar, DovizTipi, Konu, VadeTarihi, OdendiMi)
                        VALUES (@cariId, @cariTipi, @tutar, @dovizTipi, @konu, @vadeTarihi, 0)
                    `);
            }

            await transaction.commit();
            res.status(201).json({ message: 'Periyodik ödemeler başarıyla oluşturuldu.' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Periyodik ödeme oluşturulurken hata oluştu.' });
    }
};

// Ödendi olarak işaretle ve Cari Bakiyeyi Güncelle
exports.markAsPaid = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Ödeme bilgisini getir
            const paymentResult = await transaction.request()
                .input('id', sql.Int, id)
                .query(`SELECT * FROM Odemeler WHERE OdemeID = @id AND OdendiMi = 0`);

            if (paymentResult.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Ödeme bulunamadı veya zaten ödenmiş.' });
            }

            const payment = paymentResult.recordset[0];

            // 1. Ödemeyi 'Ödendi' olarak güncelle
            await transaction.request()
                .input('id', sql.Int, id)
                .query(`UPDATE Odemeler SET OdendiMi = 1, OdemeTarihi = GETDATE() WHERE OdemeID = @id`);

            // 2. CariTipi'ne göre Müşteri veya Tedarikçi bakiyesini güncelle
            // Not: PvhvErp'de bakiye tutma mantığı Musteriler tablosunda Varsa (Toplu Bakiye) güncellenir.
            // Ödeme çıktısı Cari bakiyesini düşürür. (Eğer müşteri ödemesiyse (Tahsilat) veya biz ödeme yapıyorsak duruma göre işlem değişir. Biz şu an "bizim yapacağımız veya alacağımız" durumunu Tutar üzerinden net Bakiye eksiltme olarak alıyoruz)
            if (payment.CariTipi === 'Musteri') {
                // Musteriler tablosunda Bakiye kolonu varsa guncellenir (Eğer yoksa hata almamak icin check ediyoruz)
                const checkCol = await transaction.request().query(`
                    SELECT count(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'Musteriler' AND COLUMN_NAME = 'Bakiye'
                `);
                if (checkCol.recordset[0].count > 0) {
                    await transaction.request()
                        .input('tutar', sql.Decimal(18, 2), payment.Tutar)
                        .input('cariId', sql.Int, payment.CariID)
                        .query(`UPDATE Musteriler SET Bakiye = ISNULL(Bakiye, 0) - @tutar WHERE MusteriID = @cariId`);
                }
            } else if (payment.CariTipi === 'Tedarikci') {
                const checkColT = await transaction.request().query(`
                    SELECT count(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'Tedarikciler' AND COLUMN_NAME = 'Bakiye'
                `);
                if (checkColT.recordset[0].count > 0) {
                    await transaction.request()
                        .input('tutar', sql.Decimal(18, 2), payment.Tutar)
                        .input('cariId', sql.Int, payment.CariID)
                        .query(`UPDATE Tedarikciler SET Bakiye = ISNULL(Bakiye, 0) - @tutar WHERE TedarikciID = @cariId`);
                }
            } else if (payment.CariTipi === 'Diger') {
                const checkColD = await transaction.request().query(`
                    SELECT count(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'DigerCariler' AND COLUMN_NAME = 'Bakiye'
                `);
                if (checkColD.recordset[0].count > 0) {
                    await transaction.request()
                        .input('tutar', sql.Decimal(18, 2), payment.Tutar)
                        .input('cariId', sql.Int, payment.CariID)
                        .query(`UPDATE DigerCariler SET Bakiye = ISNULL(Bakiye, 0) - @tutar WHERE CariID = @cariId`);
                }
            }

            await transaction.commit();
            res.json({ message: 'Ödeme başarıyla tamamlandı ve hesaba işlendi.' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ödeme işaretlenirken hata oluştu.' });
    }
};

exports.deletePayment = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const paymentResult = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT OdendiMi FROM Odemeler WHERE OdemeID = @id`);

        if (paymentResult.recordset.length > 0 && paymentResult.recordset[0].OdendiMi) {
            return res.status(400).json({ message: 'Ödenmiş işlemler silinemez.' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM Odemeler WHERE OdemeID = @id`);
        res.json({ message: 'Ödeme silindi.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ödeme silinirken hata oluştu.' });
    }
};

exports.updatePayment = async (req, res) => {
    const { id } = req.params;
    const { cariId, cariTipi, tutar, dovizTipi, konu, vadeTarihi } = req.body;
    try {
        const pool = await poolPromise;

        // Ödenmiş mi kontrol et
        const paymentResult = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT OdendiMi FROM Odemeler WHERE OdemeID = @id`);

        if (paymentResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Ödeme bulunamadı.' });
        }

        if (paymentResult.recordset[0].OdendiMi) {
            return res.status(400).json({ message: 'Ödenmiş işlemler değiştirilemez.' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .input('cariId', sql.Int, cariId)
            .input('cariTipi', sql.VarChar, cariTipi || 'Musteri')
            .input('tutar', sql.Decimal(18, 2), tutar)
            .input('dovizTipi', sql.VarChar, dovizTipi || 'TL')
            .input('konu', sql.NVarChar, konu)
            .input('vadeTarihi', sql.Date, vadeTarihi)
            .query(`
                UPDATE Odemeler 
                SET CariID = @cariId, 
                    CariTipi = @cariTipi, 
                    Tutar = @tutar, 
                    DovizTipi = @dovizTipi, 
                    Konu = @konu, 
                    VadeTarihi = @vadeTarihi 
                WHERE OdemeID = @id
            `);

        res.json({ message: 'Ödeme güncellendi.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ödeme güncellenirken hata oluştu.' });
    }
};
