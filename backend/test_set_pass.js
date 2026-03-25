const { poolPromise, sql } = require('./database/db');
const bcrypt = require('bcryptjs');

async function test() {
    try {
        const password = '123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const pool = await poolPromise;
        await pool.request()
            .input('Hash', sql.NVarChar, hash)
            .query('UPDATE Users SET PasswordHash = @Hash WHERE Username = \'Bulent\'');

        console.log("Updated Bulent's password to 123");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
