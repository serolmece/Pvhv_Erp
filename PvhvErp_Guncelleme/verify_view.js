const { poolPromise, sql } = require('./database/db');

async function checkView() {
    try {
        const pool = await poolPromise;
        console.log("Checking vw_StokRaporu data...");
        const result = await pool.request().query('SELECT TOP 5 * FROM vw_StokRaporu');
        console.log("Results from vw_StokRaporu:", JSON.stringify(result.recordset, null, 2));
        
        if (result.recordset.length === 0) {
            console.log("View is empty! Checking source tables...");
            const stocks = await pool.request().query('SELECT COUNT(*) as count FROM StokKartlari');
            console.log("StokKartlari count:", stocks.recordset[0].count);
            
            const movements = await pool.request().query('SELECT COUNT(*) as count FROM StokHareketleri');
            console.log("StokHareketleri count:", movements.recordset[0].count);
        }
    } catch (err) {
        console.error("Error checking view:", err);
    } finally {
        process.exit(0);
    }
}

checkView();
