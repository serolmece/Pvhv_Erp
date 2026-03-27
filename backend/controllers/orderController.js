const { poolPromise, sql } = require('../database/db');

exports.createOrder = async (req, res) => {
    const { musteriId, items, teslimTarihi } = req.body;
    // items: [{ urunId, miktar, ozelReceteId }]

    if (!musteriId || !items || items.length === 0) {
        return res.status(400).json({ message: 'Müşteri ve en az bir ürün seçilmelidir.' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Create Order
        const orderRes = await transaction.request()
            .input('MusteriID', sql.Int, musteriId)
            // .input('TeslimTarihi', sql.DateTime, teslimTarihi) // Optional
            .query(`INSERT INTO MusteriSiparisleri (MusteriID, SiparisTarihi, Durum) OUTPUT INSERTED.SiparisID VALUES (@MusteriID, GETDATE(), 'Beklemede')`);

        const orderId = orderRes.recordset[0].SiparisID;

        // 2. Insert Items
        for (const item of items) {
            await transaction.request()
                .input('SiparisID', sql.Int, orderId)
                .input('UrunID', sql.Int, item.urunId)
                .input('Miktar', sql.Decimal(18, 4), item.miktar)
                .input('OzelReceteID', sql.Int, item.ozelReceteId || null)
                .query(`INSERT INTO SiparisKalemleri (SiparisID, UrunID, Miktar, OzelReceteID) VALUES (@SiparisID, @UrunID, @Miktar, @OzelReceteID)`);
        }

        await transaction.commit();
        res.status(201).json({ message: 'Sipariş başarıyla oluşturuldu.', orderId });
    } catch (err) {
        await transaction.rollback();
        console.error('Order Creation Error:', err);
        res.status(500).json({ message: 'Sipariş oluşturulurken hata oluştu.' });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const { musteriId } = req.query;
        let query = `
            SELECT 
                MS.SiparisID, MS.SiparisTarihi, MS.TeslimTarihi, MS.Durum,
                M.Unvan AS MusteriUnvan
            FROM MusteriSiparisleri MS
            LEFT JOIN Musteriler M ON MS.MusteriID = M.MusteriID
        `;

        let pool = await poolPromise;
        let request = pool.request();

        if (musteriId) {
            query += ` WHERE MS.MusteriID = @MusteriID`;
            request.input('MusteriID', sql.Int, musteriId);
        }

        query += ` ORDER BY MS.SiparisTarihi DESC`;

        const result = await request.query(query);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ message: 'Siparişler listelenemedi' });
    }
};

exports.getOrderItems = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('SiparisID', sql.Int, id)
            .query(`
                SELECT 
                    SK.KalemID, SK.SiparisID, SK.UrunID, SK.Miktar, SK.OzelReceteID,
                    S.StokAdi AS UrunAdi, S.AnaBirim
                FROM SiparisKalemleri SK
                LEFT JOIN StokKartlari S ON SK.UrunID = S.StokID
                WHERE SK.SiparisID = @SiparisID
            `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error fetching order items:', err);
        res.status(500).json({ message: 'Sipariş detayları getirilemedi' });
    }
};

exports.completeProduction = async (req, res) => {
    const { id } = req.params;

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Check current status
        const orderCheck = await transaction.request()
            .input('SiparisID', sql.Int, id)
            .query(`SELECT Durum FROM MusteriSiparisleri WHERE SiparisID = @SiparisID`);

        if (orderCheck.recordset.length === 0) {
            throw new Error('Sipariş bulunamadı.');
        }
        if (orderCheck.recordset[0].Durum === 'Tamamlandı') {
            throw new Error('Sipariş zaten üretilip tamamlanmış.');
        }

        // Get order items
        const itemsRes = await transaction.request()
            .input('SiparisID', sql.Int, id)
            .query(`SELECT KalemID, UrunID, Miktar, OzelReceteID FROM SiparisKalemleri WHERE SiparisID = @SiparisID`);

        const items = itemsRes.recordset;

        // Fetch how much was already produced via UretimTakibi (if any)
        const prodRes = await transaction.request()
            .input('SiparisID', sql.Int, id)
            .query(`SELECT KalemID, SUM(UretilenMiktar) as ToplamUretim FROM UretimTakibi WHERE SiparisID = @SiparisID GROUP BY KalemID`);

        const productions = prodRes.recordset;

        // Iterate through items and deduct stocks based on recipes BUT only deduct the remaining unproduced amount
        for (const item of items) {
            let receteId = item.OzelReceteID;

            const producedSoFar = productions.find(p => p.KalemID === item.KalemID)?.ToplamUretim || 0;
            const remainingToProduce = item.Miktar - producedSoFar;

            if (remainingToProduce <= 0) continue; // Already fully produced by daily records

            // IF no explicit recipe is selected on the order item, try to find a default generic one
            if (!receteId) {
                const defaultRecipe = await transaction.request()
                    .input('UrunID', sql.Int, item.UrunID)
                    .query(`SELECT TOP 1 ReceteID FROM Receteler WHERE UrunID = @UrunID ORDER BY ReceteID DESC`);
                if (defaultRecipe.recordset.length > 0) {
                    receteId = defaultRecipe.recordset[0].ReceteID;
                }
            }

            if (!receteId) {
                const st = await transaction.request().input('StokID', sql.Int, item.UrunID).query(`SELECT StokAdi, ISNULL(MevcutStok, 0) as MevcutStok FROM StokKartlari WHERE StokID = @StokID`);
                if (st.recordset.length > 0 && st.recordset[0].MevcutStok < remainingToProduce) {
                    throw new Error(`Yetersiz stok: ${st.recordset[0].StokAdi}. İhtiyaç: ${remainingToProduce}, Mevcut: ${st.recordset[0].MevcutStok}`);
                }

                await transaction.request()
                    .input('StokID', sql.Int, item.UrunID)
                    .input('UsedG', sql.Decimal(18, 4), remainingToProduce)
                    .query(`UPDATE StokKartlari SET MevcutStok = ISNULL(MevcutStok, 0) - @UsedG WHERE StokID = @StokID`);
                continue;
            }

            // Get recipe details
            const detailRes = await transaction.request()
                .input('ReceteID', sql.Int, receteId)
                .query(`
                    SELECT r.HammaddeID, r.Miktar, r.HedefUrunAdedi, s.StokAdi, ISNULL(s.MevcutStok, 0) AS MevcutStok
                    FROM ReceteDetaylari r
                    JOIN StokKartlari s ON r.HammaddeID = s.StokID
                    WHERE r.ReceteID = @ReceteID
                `);

            const rawMaterials = detailRes.recordset;

            for (const rm of rawMaterials) {
                // If HedefUrunAdedi is missing in old rows, assume 1
                const divisor = rm.HedefUrunAdedi || 1;
                const totalUsed = (parseFloat(rm.Miktar) / divisor) * parseFloat(remainingToProduce);

                if (rm.MevcutStok < totalUsed) {
                    throw new Error(`Yetersiz hammadde stoğu: ${rm.StokAdi}. Kalan üretim için gereken: ${totalUsed.toFixed(2)}, Sistemdeki mevcut stok: ${rm.MevcutStok.toFixed(2)}`);
                }

                await transaction.request()
                    .input('StokID', sql.Int, rm.HammaddeID)
                    .input('Used', sql.Decimal(18, 4), totalUsed)
                    .query(`UPDATE StokKartlari SET MevcutStok = ISNULL(MevcutStok, 0) - @Used WHERE StokID = @StokID`);
            }
        }

        // Update overall status
        await transaction.request()
            .input('SiparisID', sql.Int, id)
            .query(`UPDATE MusteriSiparisleri SET Durum = 'Tamamlandı' WHERE SiparisID = @SiparisID`);

        await transaction.commit();
        res.status(200).json({ message: 'Üretim tamamlandı, eksik kalan stoklar reçeteye göre güncellendi.' });
    } catch (err) {
        await transaction.rollback();
        console.error('Production Error:', err);
        res.status(500).json({ message: err.message || 'Üretim sırasında hata oluştu.' });
    }
};

// ================= NEW METHODS FOR PARTIAL PRODUCTION =================

exports.addProductionRecord = async (req, res) => {
    const { siparisId } = req.params;
    const { kalemId, uretimTarihi, uretilenMiktar, aciklama } = req.body;

    if (!siparisId || !kalemId || !uretilenMiktar || uretilenMiktar <= 0) {
        return res.status(400).json({ message: 'Sipariş ID, Kalem ID ve geçerli bir miktar gereklidir.' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Orijinal Sipariş Kalemini Bul (Ürün ID, Reçete ID)
        const orderRes = await transaction.request()
            .input('KalemID', sql.Int, kalemId)
            .input('SiparisID', sql.Int, siparisId)
            .query(`SELECT UrunID, Miktar, OzelReceteID FROM SiparisKalemleri WHERE KalemID = @KalemID AND SiparisID = @SiparisID`);

        if (orderRes.recordset.length === 0) {
            throw new Error('Sipariş kalemi bulunamadı.');
        }

        const orderItem = orderRes.recordset[0];

        // 2. Üretim Kaydını Tabloya Ekle
        await transaction.request()
            .input('SiparisID', sql.Int, siparisId)
            .input('KalemID', sql.Int, kalemId)
            .input('UretimTarihi', sql.DateTime, new Date(uretimTarihi || new Date()))
            .input('UretilenMiktar', sql.Decimal(18, 4), uretilenMiktar)
            .input('Aciklama', sql.NVarChar, aciklama || null)
            .query(`INSERT INTO UretimTakibi (SiparisID, KalemID, UretimTarihi, UretilenMiktar, Aciklama) 
                    VALUES (@SiparisID, @KalemID, @UretimTarihi, @UretilenMiktar, @Aciklama)`);

        // 3. Stoktan Reçete Doğrultusunda SADECE uretilenMiktar kadar Düş
        let receteId = orderItem.OzelReceteID;

        // If no explicit recipe, get default
        if (!receteId) {
            const defaultRecipe = await transaction.request()
                .input('UrunID', sql.Int, orderItem.UrunID)
                .query(`SELECT TOP 1 ReceteID FROM Receteler WHERE UrunID = @UrunID ORDER BY ReceteID DESC`);
            if (defaultRecipe.recordset.length > 0) {
                receteId = defaultRecipe.recordset[0].ReceteID;
            }
        }

        if (receteId) {
            // Reçete varsa hammaddeleri düş
            const detailRes = await transaction.request()
                .input('ReceteID', sql.Int, receteId)
                .query(`
                    SELECT r.HammaddeID, r.Miktar, r.HedefUrunAdedi, s.StokAdi, ISNULL(s.MevcutStok, 0) AS MevcutStok 
                    FROM ReceteDetaylari r
                    JOIN StokKartlari s ON r.HammaddeID = s.StokID
                    WHERE r.ReceteID = @ReceteID
                `);

            for (const rm of detailRes.recordset) {
                const divisor = rm.HedefUrunAdedi || 1;
                const totalUsed = (parseFloat(rm.Miktar) / divisor) * parseFloat(uretilenMiktar);

                if (rm.MevcutStok < totalUsed) {
                    throw new Error(`Yetersiz hammadde stoğu: "${rm.StokAdi}". Üretim için gereken miktar: ${totalUsed.toFixed(2)}, sistemdeki stok: ${rm.MevcutStok.toFixed(2)}.`);
                }

                await transaction.request()
                    .input('StokID', sql.Int, rm.HammaddeID)
                    .input('Used', sql.Decimal(18, 4), totalUsed)
                    .query(`UPDATE StokKartlari SET MevcutStok = ISNULL(MevcutStok, 0) - @Used WHERE StokID = @StokID`);
            }
        } else {
            // Reçete yoksa üretilen direkt mamulun kendisinden düş (istisna durum)
            const st = await transaction.request().input('StokID', sql.Int, orderItem.UrunID).query(`SELECT StokAdi, ISNULL(MevcutStok, 0) as MevcutStok FROM StokKartlari WHERE StokID = @StokID`);
            if (st.recordset.length > 0 && st.recordset[0].MevcutStok < uretilenMiktar) {
                throw new Error(`Yetersiz stok: ${st.recordset[0].StokAdi}. İhtiyaç: ${uretilenMiktar}, Mevcut: ${st.recordset[0].MevcutStok}`);
            }

            await transaction.request()
                .input('StokID', sql.Int, orderItem.UrunID)
                .input('UsedG', sql.Decimal(18, 4), uretilenMiktar)
                .query(`UPDATE StokKartlari SET MevcutStok = ISNULL(MevcutStok, 0) - @UsedG WHERE StokID = @StokID`);
        }

        // 4. Sipariş Durumu Güncellemesi: EĞER toplam üretim hedefe ulaştıysa veya aştıysa, siparişi tamamla
        const sumRes = await transaction.request()
            .input('KalemID', sql.Int, kalemId)
            .query(`SELECT SUM(UretilenMiktar) AS ToplamUretilen FROM UretimTakibi WHERE KalemID = @KalemID`);

        const toplamUretilen = sumRes.recordset[0].ToplamUretilen;

        let msg = 'Kısmi üretim başarıyla kaydedildi ve stoktan düşüldü.';

        if (toplamUretilen >= orderItem.Miktar) {
            await transaction.request()
                .input('SiparisID', sql.Int, siparisId)
                .query(`UPDATE MusteriSiparisleri SET Durum = 'Tamamlandı' WHERE SiparisID = @SiparisID`);
            msg = 'Üretim tamamlandı, stoklar güncellendi ve Sipariş durumu Tamamlandı olarak işaretlendi.';
        } else {
            await transaction.request()
                .input('SiparisID', sql.Int, siparisId)
                .query(`UPDATE MusteriSiparisleri SET Durum = 'Üretimde' WHERE SiparisID = @SiparisID AND Durum = 'Beklemede'`);
        }

        await transaction.commit();
        res.status(200).json({ message: msg });
    } catch (err) {
        await transaction.rollback();
        console.error('Add Production Record Error:', err);
        res.status(500).json({ message: err.message || 'Üretim kaydı eklenirken hata oluştu.' });
    }
};

exports.getProductionRecords = async (req, res) => {
    try {
        const { siparisId } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('SiparisID', sql.Int, siparisId)
            .query(`
                SELECT 
                    U.UretimID, U.KalemID, U.UretimTarihi, U.UretilenMiktar, U.Aciklama,
                    S.StokAdi AS UrunAdi, S.AnaBirim
                FROM UretimTakibi U
                LEFT JOIN SiparisKalemleri SK ON U.KalemID = SK.KalemID
                LEFT JOIN StokKartlari S ON SK.UrunID = S.StokID
                WHERE U.SiparisID = @SiparisID
                ORDER BY U.UretimTarihi ASC
            `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error fetching production records:', err);
        res.status(500).json({ message: 'Üretim kayıtları getirilemedi' });
    }
};

exports.updateProductionRecord = async (req, res) => {
    const { siparisId, uretimId } = req.params;
    const { uretimTarihi, uretilenMiktar, aciklama } = req.body;

    if (!siparisId || !uretimId || !uretilenMiktar || uretilenMiktar <= 0) {
        return res.status(400).json({ message: 'Geçerli bir miktar gereklidir.' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Get existing production record to find diff
        const currentProdRes = await transaction.request()
            .input('UretimID', sql.Int, uretimId)
            .input('SiparisID', sql.Int, siparisId)
            .query(`SELECT KalemID, UretilenMiktar, Aciklama, UretimTarihi FROM UretimTakibi WHERE UretimID = @UretimID AND SiparisID = @SiparisID`);

        if (currentProdRes.recordset.length === 0) {
            throw new Error('Üretim kaydı bulunamadı.');
        }

        const oldRecord = currentProdRes.recordset[0];
        const miktarFarki = parseFloat(uretilenMiktar) - parseFloat(oldRecord.UretilenMiktar);

        // 2. Get order item and recipe info
        const orderRes = await transaction.request()
            .input('KalemID', sql.Int, oldRecord.KalemID)
            .query(`SELECT UrunID, Miktar, OzelReceteID FROM SiparisKalemleri WHERE KalemID = @KalemID`);

        const orderItem = orderRes.recordset[0];

        // 3. Update stock ONLY IF there's a difference in quantity
        if (miktarFarki !== 0) {
            let receteId = orderItem.OzelReceteID;

            if (!receteId) {
                const defaultRecipe = await transaction.request()
                    .input('UrunID', sql.Int, orderItem.UrunID)
                    .query(`SELECT TOP 1 ReceteID FROM Receteler WHERE UrunID = @UrunID ORDER BY ReceteID DESC`);
                if (defaultRecipe.recordset.length > 0) receteId = defaultRecipe.recordset[0].ReceteID;
            }

            if (receteId) {
                const detailRes = await transaction.request()
                    .input('ReceteID', sql.Int, receteId)
                    .query(`
                        SELECT r.HammaddeID, r.Miktar, r.HedefUrunAdedi, s.StokAdi, ISNULL(s.MevcutStok, 0) AS MevcutStok 
                        FROM ReceteDetaylari r
                        JOIN StokKartlari s ON r.HammaddeID = s.StokID
                        WHERE r.ReceteID = @ReceteID
                    `);

                for (const rm of detailRes.recordset) {
                    const divisor = rm.HedefUrunAdedi || 1;
                    const usedDiff = (parseFloat(rm.Miktar) / divisor) * miktarFarki;

                    if (usedDiff > 0 && rm.MevcutStok < usedDiff) {
                        throw new Error(`Güncelleme yapılamadı: Yetersiz hammadde stoğu (${rm.StokAdi}). Ek ihtiyaç: ${usedDiff.toFixed(2)}, mevcut stok: ${rm.MevcutStok.toFixed(2)}.`);
                    }

                    await transaction.request()
                        .input('StokID', sql.Int, rm.HammaddeID)
                        .input('Diff', sql.Decimal(18, 4), usedDiff)
                        .query(`UPDATE StokKartlari SET MevcutStok = ISNULL(MevcutStok, 0) - @Diff WHERE StokID = @StokID`);
                }
            } else {
                const st = await transaction.request().input('StokID', sql.Int, orderItem.UrunID).query(`SELECT StokAdi, ISNULL(MevcutStok, 0) as MevcutStok FROM StokKartlari WHERE StokID = @StokID`);
                if (miktarFarki > 0 && st.recordset.length > 0 && st.recordset[0].MevcutStok < miktarFarki) {
                    throw new Error(`Güncelleme yapılamadı: Yetersiz stok (${st.recordset[0].StokAdi}). Ek ihtiyaç: ${miktarFarki}, mevcut: ${st.recordset[0].MevcutStok}`);
                }

                await transaction.request()
                    .input('StokID', sql.Int, orderItem.UrunID)
                    .input('DiffG', sql.Decimal(18, 4), miktarFarki)
                    .query(`UPDATE StokKartlari SET MevcutStok = ISNULL(MevcutStok, 0) - @DiffG WHERE StokID = @StokID`);
            }
        }

        // 4. Update the DB record
        await transaction.request()
            .input('UretimID', sql.Int, uretimId)
            .input('UretimTarihi', sql.DateTime, new Date(uretimTarihi || new Date()))
            .input('UretilenMiktar', sql.Decimal(18, 4), uretilenMiktar)
            .input('Aciklama', sql.NVarChar, aciklama || null)
            .query(`UPDATE UretimTakibi SET UretimTarihi = @UretimTarihi, UretilenMiktar = @UretilenMiktar, Aciklama = @Aciklama WHERE UretimID = @UretimID`);

        // 5. Check if order status needs to revert to 'Üretimde' if total drops below target
        const sumRes = await transaction.request()
            .input('KalemID', sql.Int, oldRecord.KalemID)
            .query(`SELECT SUM(UretilenMiktar) AS ToplamUretilen FROM UretimTakibi WHERE KalemID = @KalemID`);
        const totalNow = sumRes.recordset[0].ToplamUretilen;

        if (totalNow < orderItem.Miktar) {
            await transaction.request()
                .input('SiparisID', sql.Int, siparisId)
                .query(`UPDATE MusteriSiparisleri SET Durum = 'Üretimde' WHERE SiparisID = @SiparisID AND Durum = 'Tamamlandı'`);
        } else if (totalNow >= orderItem.Miktar) {
            await transaction.request()
                .input('SiparisID', sql.Int, siparisId)
                .query(`UPDATE MusteriSiparisleri SET Durum = 'Tamamlandı' WHERE SiparisID = @SiparisID`);
        }

        await transaction.commit();
        res.status(200).json({ message: 'Üretim kaydı güncellendi ve stoklar dengelendi.' });
    } catch (err) {
        await transaction.rollback();
        console.error('Update Production Record Error:', err);
        res.status(500).json({ message: err.message || 'Üretim kaydı güncellenirken hata oluştu.' });
    }
};

exports.deleteProductionRecord = async (req, res) => {
    const { siparisId, uretimId } = req.params;

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Get record 
        const currentProdRes = await transaction.request()
            .input('UretimID', sql.Int, uretimId)
            .input('SiparisID', sql.Int, siparisId)
            .query(`SELECT KalemID, UretilenMiktar FROM UretimTakibi WHERE UretimID = @UretimID AND SiparisID = @SiparisID`);

        if (currentProdRes.recordset.length === 0) {
            throw new Error('Silinecek üretim kaydı bulunamadı.');
        }

        const oldRecord = currentProdRes.recordset[0];

        // 2. Get order item and recipe info
        const orderRes = await transaction.request()
            .input('KalemID', sql.Int, oldRecord.KalemID)
            .query(`SELECT UrunID, OzelReceteID FROM SiparisKalemleri WHERE KalemID = @KalemID`);

        const orderItem = orderRes.recordset[0];

        // 3. Restore Stock
        let receteId = orderItem.OzelReceteID;
        if (!receteId) {
            const defaultRecipe = await transaction.request()
                .input('UrunID', sql.Int, orderItem.UrunID)
                .query(`SELECT TOP 1 ReceteID FROM Receteler WHERE UrunID = @UrunID ORDER BY ReceteID DESC`);
            if (defaultRecipe.recordset.length > 0) receteId = defaultRecipe.recordset[0].ReceteID;
        }

        if (receteId) {
            const detailRes = await transaction.request()
                .input('ReceteID', sql.Int, receteId)
                .query(`SELECT HammaddeID, Miktar, HedefUrunAdedi FROM ReceteDetaylari WHERE ReceteID = @ReceteID`);

            for (const rm of detailRes.recordset) {
                const divisor = rm.HedefUrunAdedi || 1;
                // Add positive amount back to stock
                const usedToRestore = (parseFloat(rm.Miktar) / divisor) * parseFloat(oldRecord.UretilenMiktar);

                await transaction.request()
                    .input('StokID', sql.Int, rm.HammaddeID)
                    .input('Used', sql.Decimal(18, 4), usedToRestore)
                    .query(`UPDATE StokKartlari SET MevcutStok = ISNULL(MevcutStok, 0) + @Used WHERE StokID = @StokID`); // Notice the + operator
            }
        } else {
            await transaction.request()
                .input('StokID', sql.Int, orderItem.UrunID)
                .input('UsedG', sql.Decimal(18, 4), oldRecord.UretilenMiktar)
                .query(`UPDATE StokKartlari SET MevcutStok = ISNULL(MevcutStok, 0) + @UsedG WHERE StokID = @StokID`);
        }

        // 4. Delete the DB record
        await transaction.request()
            .input('UretimID', sql.Int, uretimId)
            .query(`DELETE FROM UretimTakibi WHERE UretimID = @UretimID`);

        // 5. Re-evaluate order status (revert to Üretimde or Beklemede potentially)
        // Leaving it as correctly identified based on sum could be tricky (if sum=0 -> Beklemede).
        const sumRes = await transaction.request()
            .input('KalemID', sql.Int, oldRecord.KalemID)
            .query(`SELECT ISNULL(SUM(UretilenMiktar), 0) AS ToplamUretilen FROM UretimTakibi WHERE KalemID = @KalemID`);

        const totalNow = sumRes.recordset[0].ToplamUretilen;

        if (totalNow === 0) {
            await transaction.request()
                .input('SiparisID', sql.Int, siparisId)
                // Just as a blanket backup, we mark it missing if EVERYTHING is missing.
                .query(`UPDATE MusteriSiparisleri SET Durum = 'Beklemede' WHERE SiparisID = @SiparisID AND NOT EXISTS (SELECT 1 FROM UretimTakibi WHERE SiparisID = @SiparisID)`);
        } else {
            await transaction.request()
                .input('SiparisID', sql.Int, siparisId)
                .query(`UPDATE MusteriSiparisleri SET Durum = 'Üretimde' WHERE SiparisID = @SiparisID AND Durum = 'Tamamlandı'`);
        }

        await transaction.commit();
        res.status(200).json({ message: 'Üretim kaydı silindi ve stoklara iade edildi.' });
    } catch (err) {
        await transaction.rollback();
        console.error('Delete Production Record Error:', err);
        res.status(500).json({ message: err.message || 'Üretim kaydı silinirken hata oluştu.' });
    }
};

// ================== NEEDS ANALYSIS ==================

exports.getOrderNeeds = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        // 1. Get order items
        const itemsRes = await pool.request()
            .input('SiparisID', sql.Int, id)
            .query(`SELECT KalemID, UrunID, Miktar, OzelReceteID FROM SiparisKalemleri WHERE SiparisID = @SiparisID`);

        const items = itemsRes.recordset;

        // Fetch how much was already produced via UretimTakibi (if any)
        const prodRes = await pool.request()
            .input('SiparisID', sql.Int, id)
            .query(`SELECT KalemID, ISNULL(SUM(UretilenMiktar), 0) as ToplamUretim FROM UretimTakibi WHERE SiparisID = @SiparisID GROUP BY KalemID`);

        const productions = prodRes.recordset;

        const totalNeeds = {};

        for (const item of items) {
            let receteId = item.OzelReceteID;

            const producedSoFar = productions.find(p => p.KalemID === item.KalemID)?.ToplamUretim || 0;
            const remainingToProduce = item.Miktar - producedSoFar;

            if (remainingToProduce <= 0) continue; // Already fully produced

            if (!receteId) {
                const defaultRecipe = await pool.request()
                    .input('UrunID', sql.Int, item.UrunID)
                    .query(`SELECT TOP 1 ReceteID FROM Receteler WHERE UrunID = @UrunID ORDER BY ReceteID DESC`);
                if (defaultRecipe.recordset.length > 0) receteId = defaultRecipe.recordset[0].ReceteID;
            }

            if (receteId) {
                const detailRes = await pool.request()
                    .input('ReceteID', sql.Int, receteId)
                    .query(`
                        SELECT r.HammaddeID, r.Miktar, r.HedefUrunAdedi, s.StokKodu, s.StokAdi, ISNULL(s.MevcutStok, 0) AS MevcutStok, s.AnaBirim
                        FROM ReceteDetaylari r
                        JOIN StokKartlari s ON r.HammaddeID = s.StokID
                        WHERE r.ReceteID = @ReceteID
                    `);

                for (const rm of detailRes.recordset) {
                    const divisor = rm.HedefUrunAdedi || 1;
                    const requiredForThisItem = (parseFloat(rm.Miktar) / divisor) * parseFloat(remainingToProduce);

                    if (!totalNeeds[rm.HammaddeID]) {
                        totalNeeds[rm.HammaddeID] = {
                            HammaddeID: rm.HammaddeID,
                            StokKodu: rm.StokKodu,
                            StokAdi: rm.StokAdi,
                            AnaBirim: rm.AnaBirim,
                            MevcutStok: rm.MevcutStok,
                            ToplamIhtiyac: 0
                        };
                    }
                    totalNeeds[rm.HammaddeID].ToplamIhtiyac += requiredForThisItem;
                }
            } else {
               // No recipe, assume the product itself is the raw material
                const st = await pool.request().input('StokID', sql.Int, item.UrunID).query(`SELECT StokKodu, StokAdi, ISNULL(MevcutStok, 0) as MevcutStok, AnaBirim FROM StokKartlari WHERE StokID = @StokID`);
                if (st.recordset.length > 0) {
                    const productData = st.recordset[0];
                    if (!totalNeeds[item.UrunID]) {
                        totalNeeds[item.UrunID] = {
                            HammaddeID: item.UrunID,
                            StokKodu: productData.StokKodu,
                            StokAdi: productData.StokAdi,
                            AnaBirim: productData.AnaBirim,
                            MevcutStok: productData.MevcutStok,
                            ToplamIhtiyac: 0
                        };
                    }
                    totalNeeds[item.UrunID].ToplamIhtiyac += remainingToProduce;
                }
            }
        }

        const responseData = Object.values(totalNeeds).map(need => {
            const fark = need.MevcutStok - need.ToplamIhtiyac;
            return {
                ...need,
                EksikMiktar: fark < 0 ? Math.abs(fark) : 0,
                Durum: fark < 0 ? 'Yetersiz' : 'Yeterli'
            };
        });

        res.status(200).json(responseData);
    } catch (err) {
        console.error('Error calculating order needs:', err);
        res.status(500).json({ message: 'İhtiyaç analizi yapılırken hata oluştu.' });
    }
};
