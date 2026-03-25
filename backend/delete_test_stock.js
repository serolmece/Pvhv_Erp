const { poolPromise } = require('./database/db');
async function run() {
    try {
        const pool = await poolPromise;
        await pool.request().query("DELETE FROM StokKartlari WHERE StokKodu LIKE 'TEST_%'");
        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
}
run();
