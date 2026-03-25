const { poolPromise, sql } = require('../database/db');
const XLSX = require('xlsx');

// 1. Get All Stock Cards (filtered & sorted if implemented)
exports.getAllStockCards = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                sk.*,
                kat.KategoriAdi
            FROM StokKartlari sk
            LEFT JOIN StokKategorileri kat ON sk.KategoriID = kat.KategoriID
            ORDER BY sk.OlusturmaTarihi DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 2. Create Stock Card
exports.createStockCard = async (req, res) => {
    const {
        stokKodu, stokAdi, barkod, kategoriId, marka, model,
        anaBirim, altBirim, alisFiyati, satisFiyati, kdvOrani, paraBirimi,
        minStok, maxStok
    } = req.body;

    try {
        const pool = await poolPromise;

        // Auto-generate barcode if duplicate or empty? Logic can be handled here or frontend.
        // Assuming unique constraint on barcode.

        await pool.request()
            .input('StokKodu', sql.NVarChar, stokKodu)
            .input('StokAdi', sql.NVarChar, stokAdi)
            .input('Barkod', sql.NVarChar, (barkod && barkod.trim() !== '') ? barkod.trim() : null)
            .input('KategoriID', sql.Int, kategoriId ? parseInt(kategoriId) : null)
            .input('Marka', sql.NVarChar, marka || null)
            .input('Model', sql.NVarChar, model || null)
            .input('AnaBirim', sql.NVarChar, anaBirim || 'Adet')
            .input('AltBirim', sql.NVarChar, altBirim || null)
            .input('AlisFiyati', sql.Decimal(18, 2), alisFiyati ? parseFloat(alisFiyati) : 0)
            .input('SatisFiyati', sql.Decimal(18, 2), satisFiyati ? parseFloat(satisFiyati) : 0)
            .input('KDVOrani', sql.Int, kdvOrani ? parseInt(kdvOrani) : 18)
            .input('ParaBirimi', sql.NVarChar, paraBirimi || 'TL')
            .input('MinStokSeviyesi', sql.Decimal(18, 2), minStok ? parseFloat(minStok) : 0)
            .input('MaxStokSeviyesi', sql.Decimal(18, 2), maxStok ? parseFloat(maxStok) : 0)
            .query(`INSERT INTO StokKartlari (
                StokKodu, StokAdi, Barkod, KategoriID, Marka, Model, 
                AnaBirim, AltBirim, AlisFiyati, SatisFiyati, KDVOrani, ParaBirimi,
                MinStokSeviyesi, MaxStokSeviyesi
            ) VALUES (
                @StokKodu, @StokAdi, @Barkod, @KategoriID, @Marka, @Model,
                @AnaBirim, @AltBirim, @AlisFiyati, @SatisFiyati, @KDVOrani, @ParaBirimi,
                @MinStokSeviyesi, @MaxStokSeviyesi
            )`);

        res.status(201).json({ message: 'Stok kartı başarıyla oluşturuldu.' });
    } catch (err) {
        if (err.number === 2627) { // Unique constraint violation (Barcode or StockCode)
            return res.status(400).json({ message: 'Stok kodu veya barkod zaten mevcut.' });
        }
        res.status(500).json({ message: err.message });
    }
};

// 3. Update Stock Card
exports.updateStockCard = async (req, res) => {
    const { id } = req.params;
    const {
        stokKodu, stokAdi, barkod, kategoriId, marka, model,
        anaBirim, altBirim, alisFiyati, satisFiyati, kdvOrani, paraBirimi,
        minStok, maxStok
    } = req.body;
    try {
        console.log("UPDATE STOCK CARD PAYLOAD:", req.body);
        const pool = await poolPromise;
        await pool.request()
            .input('StokID', sql.Int, id)
            .input('StokKodu', sql.NVarChar, stokKodu)
            .input('StokAdi', sql.NVarChar, stokAdi)
            .input('Barkod', sql.NVarChar, (barkod && barkod.trim() !== '') ? barkod.trim() : null)
            .input('KategoriID', sql.Int, kategoriId ? parseInt(kategoriId) : null)
            .input('Marka', sql.NVarChar, marka || null)
            .input('Model', sql.NVarChar, model || null)
            .input('AnaBirim', sql.NVarChar, anaBirim || 'Adet')
            .input('AltBirim', sql.NVarChar, altBirim || null)
            .input('AlisFiyati', sql.Decimal(18, 2), alisFiyati ? parseFloat(alisFiyati) : 0)
            .input('SatisFiyati', sql.Decimal(18, 2), satisFiyati ? parseFloat(satisFiyati) : 0)
            .input('KDVOrani', sql.Int, kdvOrani ? parseInt(kdvOrani) : 18)
            .input('ParaBirimi', sql.NVarChar, paraBirimi || 'TL')
            .input('MinStokSeviyesi', sql.Decimal(18, 2), minStok ? parseFloat(minStok) : 0)
            .input('MaxStokSeviyesi', sql.Decimal(18, 2), maxStok ? parseFloat(maxStok) : 0)
            .query(`UPDATE StokKartlari SET 
                StokKodu = @StokKodu, StokAdi = @StokAdi, Barkod = @Barkod, 
                KategoriID = @KategoriID, Marka = @Marka, Model = @Model,
                AnaBirim = @AnaBirim, AltBirim = @AltBirim, 
                AlisFiyati = @AlisFiyati, SatisFiyati = @SatisFiyati, 
                KDVOrani = @KDVOrani, ParaBirimi = @ParaBirimi,
                MinStokSeviyesi = @MinStokSeviyesi, MaxStokSeviyesi = @MaxStokSeviyesi,
                GuncellemeTarihi = GETDATE()
                WHERE StokID = @StokID`);

        res.json({ message: 'Stok kartı güncellendi.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 4. Delete Stock Card
exports.deleteStockCard = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        // Check if stock has movements before deleting! Usually safer to mark inactive.
        // For now, strict delete.
        await pool.request()
            .input('StokID', sql.Int, id)
            .query('DELETE FROM StokKartlari WHERE StokID = @StokID');

        res.json({ message: 'Stok kartı silindi.' });
    } catch (err) {
        res.status(500).json({ message: 'Bu stok kartına bağlı hareketler olabilir. Silinemedi.' });
    }
};

// 5. Get Categories (Helper)
exports.getCategories = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM StokKategorileri');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 6. Create Category
exports.createCategory = async (req, res) => {
    const { kategoriAdi, aciklama } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('KategoriAdi', sql.NVarChar, kategoriAdi)
            .input('Aciklama', sql.NVarChar, aciklama)
            .query('INSERT INTO StokKategorileri (KategoriAdi, Aciklama) VALUES (@KategoriAdi, @Aciklama)');
        res.status(201).json({ message: 'Category created' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 7. Update Category
exports.updateCategory = async (req, res) => {
    const { id } = req.params;
    const { kategoriAdi, aciklama } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('KategoriID', sql.Int, id)
            .input('KategoriAdi', sql.NVarChar, kategoriAdi)
            .input('Aciklama', sql.NVarChar, aciklama)
            .query('UPDATE StokKategorileri SET KategoriAdi = @KategoriAdi, Aciklama = @Aciklama WHERE KategoriID = @KategoriID');
        res.json({ message: 'Category updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 8. Delete Category
exports.deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        // Check if category is used
        const check = await pool.request()
            .input('KategoriID', sql.Int, id)
            .query('SELECT COUNT(*) as count FROM StokKartlari WHERE KategoriID = @KategoriID');

        if (check.recordset[0].count > 0) {
            return res.status(400).json({ message: 'Bu kategoriye ait stok kartları var. Silinemez.' });
        }

        await pool.request()
            .input('KategoriID', sql.Int, id)
            .query('DELETE FROM StokKategorileri WHERE KategoriID = @KategoriID');
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 9. Generate Unique Barcode
exports.generateBarcode = async (req, res) => {
    try {
        // Simple logic: timestamp + random or sequential based on last ID
        const uniqueSuffix = Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10);
        res.json({ barcode: `EAN${uniqueSuffix}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
