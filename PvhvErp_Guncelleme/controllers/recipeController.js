const { poolPromise, sql } = require('../database/db');

exports.getStocksForRecipe = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                s.StokID, 
                s.StokAdi, 
                s.StokKodu, 
                s.AnaBirim, 
                ISNULL(
                    (SELECT TOP 1 sh.BirimFiyat 
                     FROM StokHareketleri sh 
                     WHERE sh.StokID = s.StokID AND sh.HareketTipi = 'Giris' 
                     ORDER BY sh.Tarih DESC), 
                    s.AlisFiyati
                ) AS SonAlisFiyati
            FROM StokKartlari s
            ORDER BY s.StokAdi ASC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching stocks for recipe:', err);
        res.status(500).json({ message: 'Stok listesi alınamadı.' });
    }
};

exports.createRecipe = async (req, res) => {
    const { urunId, aciklama, items, musteriId } = req.body;

    if (!urunId || !items || items.length === 0) {
        return res.status(400).json({ message: 'Ürün ve en az bir hammadde seçilmelidir.' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const recipeRes = await transaction.request()
            .input('UrunID', sql.Int, urunId)
            .input('Aciklama', sql.NVarChar, aciklama || '')
            .input('MusteriID', sql.Int, musteriId || null)
            .query(`INSERT INTO Receteler (UrunID, Aciklama, MusteriID) OUTPUT INSERTED.ReceteID VALUES (@UrunID, @Aciklama, @MusteriID)`);

        const recipeId = recipeRes.recordset[0].ReceteID;

        for (const item of items) {
            await transaction.request()
                .input('ReceteID', sql.Int, recipeId)
                .input('HammaddeID', sql.Int, item.hammaddeId)
                .input('Miktar', sql.Decimal(18, 4), item.miktar)
                .input('Birim', sql.NVarChar, item.birim)
                .input('HedefUrunAdedi', sql.Decimal(18, 2), item.hedefUrunAdedi || 1)
                .query(`INSERT INTO ReceteDetaylari (ReceteID, HammaddeID, Miktar, Birim, HedefUrunAdedi) VALUES (@ReceteID, @HammaddeID, @Miktar, @Birim, @HedefUrunAdedi)`);
        }

        await transaction.commit();
        res.status(201).json({ message: 'Reçete başarıyla oluşturuldu.', recipeId });

    } catch (err) {
        await transaction.rollback();
        console.error('Recipe Creation Error:', err);
        res.status(500).json({ message: 'Reçete oluşturulurken hata oluştu.' });
    }
};

exports.getRecipesByProduct = async (req, res) => {
    const { urunId } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UrunID', sql.Int, urunId)
            .query(`
                SELECT 
                    r.ReceteID, 
                    r.Aciklama, 
                    r.OlusturmaTarihi, 
                    r.MusteriID, 
                    m.Unvan AS MusteriUnvan 
                FROM Receteler r
                LEFT JOIN Musteriler m ON r.MusteriID = m.MusteriID
                WHERE r.UrunID = @UrunID
                ORDER BY r.OlusturmaTarihi DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching recipes:', err);
        res.status(500).json({ message: 'Reçeteler alınamadı.' });
    }
};

exports.getAllRecipes = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT 
                    r.ReceteID, 
                    r.Aciklama, 
                    r.OlusturmaTarihi, 
                    r.MusteriID, 
                    m.Unvan AS MusteriUnvan,
                    sk.StokAdi AS UrunAdi,
                    sk.StokKodu AS UrunKodu
                FROM Receteler r
                LEFT JOIN Musteriler m ON r.MusteriID = m.MusteriID
                LEFT JOIN StokKartlari sk ON r.UrunID = sk.StokID
                ORDER BY r.OlusturmaTarihi DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching all recipes:', err);
        res.status(500).json({ message: 'Tüm reçeteler alınamadı.' });
    }
};

exports.getRecipeDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ReceteID', sql.Int, id)
            .query(`
                SELECT 
                    rd.HammaddeID, 
                    rd.Miktar, 
                    rd.Birim,
                    rd.HedefUrunAdedi,
                    sk.StokAdi AS HammaddeAdi,
                    sk.StokKodu AS HammaddeKodu
                FROM ReceteDetaylari rd
                LEFT JOIN StokKartlari sk ON rd.HammaddeID = sk.StokID
                WHERE rd.ReceteID = @ReceteID
            `);

        // Also get header info just in case
        const headerRes = await pool.request()
            .input('ReceteID', sql.Int, id)
            .query('SELECT * FROM Receteler WHERE ReceteID = @ReceteID');

        if (headerRes.recordset.length === 0) {
            return res.status(404).json({ message: 'Reçete bulunamadı.' });
        }

        res.json({
            header: headerRes.recordset[0],
            items: result.recordset
        });
    } catch (err) {
        console.error('Error fetching recipe details:', err);
        res.status(500).json({ message: 'Reçete detayları alınamadı.' });
    }
};

exports.updateRecipe = async (req, res) => {
    const { id } = req.params;
    const { urunId, aciklama, items, musteriId } = req.body;

    if (!urunId || !items || items.length === 0) {
        return res.status(400).json({ message: 'Ürün ve en az bir hammadde seçilmelidir.' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Update header
        await transaction.request()
            .input('ReceteID', sql.Int, id)
            .input('UrunID', sql.Int, urunId)
            .input('Aciklama', sql.NVarChar, aciklama || '')
            .input('MusteriID', sql.Int, musteriId || null)
            .query(`UPDATE Receteler SET UrunID = @UrunID, Aciklama = @Aciklama, MusteriID = @MusteriID WHERE ReceteID = @ReceteID`);

        // Delete old items
        await transaction.request()
            .input('ReceteID', sql.Int, id)
            .query(`DELETE FROM ReceteDetaylari WHERE ReceteID = @ReceteID`);

        // Insert new items
        for (const item of items) {
            await transaction.request()
                .input('ReceteID', sql.Int, id)
                .input('HammaddeID', sql.Int, item.hammaddeId)
                .input('Miktar', sql.Decimal(18, 4), item.miktar)
                .input('Birim', sql.NVarChar, item.birim)
                .input('HedefUrunAdedi', sql.Decimal(18, 2), item.hedefUrunAdedi || 1)
                .query(`INSERT INTO ReceteDetaylari (ReceteID, HammaddeID, Miktar, Birim, HedefUrunAdedi) VALUES (@ReceteID, @HammaddeID, @Miktar, @Birim, @HedefUrunAdedi)`);
        }

        await transaction.commit();
        res.status(200).json({ message: 'Reçete başarıyla güncellendi.' });

    } catch (err) {
        await transaction.rollback();
        console.error('Recipe Update Error:', err);
        res.status(500).json({ message: 'Reçete güncellenirken hata oluştu.' });
    }
};

exports.deleteRecipe = async (req, res) => {
    const { id } = req.params;

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Detayları sil
        await transaction.request()
            .input('ReceteID', sql.Int, id)
            .query('DELETE FROM ReceteDetaylari WHERE ReceteID = @ReceteID');

        // Başlığı sil
        await transaction.request()
            .input('ReceteID', sql.Int, id)
            .query('DELETE FROM Receteler WHERE ReceteID = @ReceteID');

        await transaction.commit();
        res.json({ message: 'Reçete silindi.' });
    } catch (err) {
        await transaction.rollback();
        console.error('Recipe Delete Error:', err);
        res.status(500).json({ message: 'Reçete silinirken hata oluştu.' });
    }
};
