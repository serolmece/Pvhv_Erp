const { poolPromise, sql } = require('./db');
// Ensure db.js exists in same dir as this script (backend/database/)

async function testCustomerOrderData() {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();
        console.log('Transaction started.');

        // 1. Create a Customer
        const customerRes = await transaction.request()
            .query(`INSERT INTO Musteriler (Unvan, VKN, Adres, Iletisim) OUTPUT INSERTED.MusteriID VALUES ('Test Customer Ltd', '1234567890', 'Test Address 123', 'test@customer.com')`);

        const customerID = customerRes.recordset[0].MusteriID;
        console.log(`Created Customer: ID=${customerID}`);

        // 2. Create an Order
        const orderRes = await transaction.request()
            .input('MusteriID', sql.Int, customerID)
            .query(`INSERT INTO MusteriSiparisleri (MusteriID, SiparisTarihi, Durum) OUTPUT INSERTED.SiparisID VALUES (@MusteriID, GETDATE(), 'Beklemede')`);

        const orderID = orderRes.recordset[0].SiparisID;
        console.log(`Created Order: ID=${orderID}`);

        // 3. Get a Product (StokKartlari) to link
        // We need a product. Let's create a dummy one or use existing.
        // To be safe, let's create a dummy product inside transaction too.
        const productRes = await transaction.request()
            .query(`INSERT INTO StokKartlari (StokKodu, StokAdi, AnaBirim, AlisFiyati, Barkod) OUTPUT INSERTED.StokID VALUES ('TEST-PROD-' + CAST(NEWID() AS NVARCHAR(36)), 'Test Order Product', 'Adet', 50, 'BAR-' + CAST(NEWID() AS NVARCHAR(36)))`);

        const productID = productRes.recordset[0].StokID;
        console.log(`Created Dummy Product: ID=${productID}`);

        // 4. Create Order Item
        // Try creating with NULL OzelReceteID first
        const itemRes = await transaction.request()
            .input('SiparisID', sql.Int, orderID)
            .input('UrunID', sql.Int, productID)
            .input('Miktar', sql.Decimal(18, 4), 10)
            .query(`INSERT INTO SiparisKalemleri (SiparisID, UrunID, Miktar) OUTPUT INSERTED.KalemID VALUES (@SiparisID, @UrunID, @Miktar)`);

        const itemID = itemRes.recordset[0].KalemID;
        console.log(`Created Order Item: ID=${itemID}`);

        // Verify Data via Join
        const verifyRes = await transaction.request()
            .input('SiparisID', sql.Int, orderID)
            .query(`
                SELECT 
                    o.SiparisID, 
                    c.Unvan as CustomerName, 
                    p.StokAdi as ProductName, 
                    i.Miktar 
                FROM MusteriSiparisleri o
                JOIN Musteriler c ON o.MusteriID = c.MusteriID
                JOIN SiparisKalemleri i ON o.SiparisID = i.SiparisID
                JOIN StokKartlari p ON i.UrunID = p.StokID
                WHERE o.SiparisID = @SiparisID
            `);

        console.table(verifyRes.recordset);

        // Rollback to clean up
        console.log('Rolling back transaction (Clean test).');
        await transaction.rollback();
        console.log('Test Complete: Success');

    } catch (err) {
        console.error('Test Failed:', err);
        if (transaction) await transaction.rollback();
    } finally {
        process.exit(0);
    }
}

testCustomerOrderData();
