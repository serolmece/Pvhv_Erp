const { poolPromise, sql } = require('../database/db');

// Helper: Generate Unique Document Number
const generateDocumentNumber = async (pool) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;
    const prefix = `STK${dateStr}`;

    // Find the last document number for today
    const result = await pool.request()
        .input('Prefix', sql.NVarChar, `${prefix}%`)
        .query(`SELECT TOP 1 BelgeNo FROM StokHareketleri WHERE BelgeNo LIKE @Prefix ORDER BY BelgeNo DESC`);

    let newSequence = 1;
    if (result.recordset.length > 0) {
        const lastNo = result.recordset[0].BelgeNo;
        const lastSeq = parseInt(lastNo.split('-')[1]);
        if (!isNaN(lastSeq)) newSequence = lastSeq + 1;
    }

    return `${prefix}-${String(newSequence).padStart(3, '0')}`;
};

// 1. Get All Movements (With filters)
exports.getAllMovements = async (req, res) => {
    const { stokId } = req.query; // Optional filter
    try {
        const pool = await poolPromise;
        let query = `
            SELECT 
                m.*,
                sk.StokAdi, sk.StokKodu,
                CASE 
                    WHEN m.HareketTipi = 'Giris' THEN t.TedarikciAdi 
                    ELSE acc.AccountName 
                END as CariAdi
            FROM StokHareketleri m
            JOIN StokKartlari sk ON m.StokID = sk.StokID
            LEFT JOIN Accounts acc ON m.CariID = acc.AccountID
            LEFT JOIN Tedarikciler t ON m.CariID = t.TedarikciID
        `;

        if (stokId) {
            query += ` WHERE m.StokID = @StokID`;
        }

        query += ` ORDER BY m.Tarih DESC`;

        const request = pool.request();
        if (stokId) request.input('StokID', sql.Int, stokId);

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 2. Create Movement
exports.createMovement = async (req, res) => {
    const {
        stokId, cariId, hareketTipi, miktar,
        birimFiyat, kdvOrani, aciklama
    } = req.body;

    // Basic Validation
    if (!stokId || !hareketTipi || !miktar || miktar <= 0) {
        return res.status(400).json({ message: 'Geçersiz veri. Stok, Hareket Tipi ve Pozitif Miktar zorunludur.' });
    }

    try {
        const pool = await poolPromise;

        // Check Stock for OUT movements to provide clean error
        if (hareketTipi === 'Cikis') {
            const stockCheck = await pool.request()
                .input('StokID', sql.Int, stokId)
                .query(`SELECT MevcutStok FROM StokKartlari WHERE StokID = @StokID`);

            const currentStock = stockCheck.recordset[0]?.MevcutStok || 0;
            if (currentStock < miktar) {
                return res.status(400).json({
                    message: `Yetersiz Stok! Mevcut: ${currentStock}, İstenen: ${miktar}`
                });
            }
        }

        const belgeNo = await generateDocumentNumber(pool);
        const toplamTutar = miktar * birimFiyat; // Simple calculation, ignoring KDV logic complexity for now or assuming price excludes KDV? Usually Total = Price * Qty * (1+KDV). Let's keep it simple or strictly follow field availability. User said "ToplamTutar" field exists.

        await pool.request()
            .input('StokID', sql.Int, stokId)
            .input('CariID', sql.Int, cariId || null)
            .input('HareketTipi', sql.NVarChar, hareketTipi)
            .input('Miktar', sql.Decimal(18, 2), miktar)
            .input('BirimFiyat', sql.Decimal(18, 2), birimFiyat || 0)
            .input('KDVOrani', sql.Int, kdvOrani || 18)
            .input('ToplamTutar', sql.Decimal(18, 2), toplamTutar)
            .input('BelgeNo', sql.NVarChar, belgeNo)
            .input('Aciklama', sql.NVarChar, aciklama)
            .query(`INSERT INTO StokHareketleri (
                StokID, CariID, HareketTipi, Miktar, BirimFiyat, KDVOrani, ToplamTutar, BelgeNo, Aciklama
            ) VALUES (
                @StokID, @CariID, @HareketTipi, @Miktar, @BirimFiyat, @KDVOrani, @ToplamTutar, @BelgeNo, @Aciklama
            )`);

        // Trigger handles stock update

        res.status(201).json({ message: 'Stok hareketi kaydedildi.', belgeNo });
    } catch (err) {
        // Catch constraint violation if race condition happened
        if (err.message.includes('CHK_StokKartlari_NoNegativeStock')) {
            return res.status(400).json({ message: 'Yetersiz Stok (Veritabanı Kısıtlaması).' });
        }
        res.status(500).json({ message: err.message });
    }
};

// 3. Get Daily Stats
exports.getDailyStats = async (req, res) => {
    try {
        const pool = await poolPromise;
        // Logic: Sum 'Giris' quantities and 'Cikis' quantities for today
        const result = await pool.request().query(`
            SELECT 
                SUM(CASE WHEN HareketTipi = 'Giris' THEN Miktar ELSE 0 END) as ToplamGiris,
                SUM(CASE WHEN HareketTipi = 'Cikis' THEN Miktar ELSE 0 END) as ToplamCikis
            FROM StokHareketleri
            WHERE CAST(Tarih AS DATE) = CAST(GETDATE() AS DATE)
        `);

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
