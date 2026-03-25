const { poolPromise, sql } = require('./database/db');
async function test() {
    try {
        const pool = await poolPromise;
        const testCode = 'TEST_123';
        const barkod = ''; // Empmty string might be treated as unique duplicate
        await pool.request()
            .input('StokKodu', sql.NVarChar, testCode)
            .input('StokAdi', sql.NVarChar, "Test Stok")
            .input('Barkod', sql.NVarChar, barkod)
            .input('AnaBirim', sql.NVarChar, 'Adet')
            .query(`INSERT INTO StokKartlari (StokKodu, StokAdi, Barkod, AnaBirim) VALUES (@StokKodu, @StokAdi, @Barkod, @AnaBirim)`);
        console.log("Success with empty string 1");

        await pool.request()
            .input('StokKodu', sql.NVarChar, testCode + "_2")
            .input('StokAdi', sql.NVarChar, "Test Stok 2")
            .input('Barkod', sql.NVarChar, barkod)
            .input('AnaBirim', sql.NVarChar, 'Adet')
            .query(`INSERT INTO StokKartlari (StokKodu, StokAdi, Barkod, AnaBirim) VALUES (@StokKodu, @StokAdi, @Barkod, @AnaBirim)`);
        console.log("Success with empty string 2");

        process.exit(0);
    } catch (e) {
        console.error("Error expected due to empty string uniqueness:", e.message);
        process.exit(1);
    }
}
test();
