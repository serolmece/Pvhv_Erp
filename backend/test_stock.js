const { poolPromise } = require('./database/db');
async function test() {
    try {
        const pool = await poolPromise;
        const res = await pool.request().query("SELECT StokKodu, Barkod FROM StokKartlari WHERE Barkod = '' OR Barkod IS NULL");
        console.log(res.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
