const { poolPromise } = require('./database/db');
async function test() {
    try {
        const pool = await poolPromise;
        const res = await pool.request().query('SELECT * FROM Users');
        console.log(res.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
