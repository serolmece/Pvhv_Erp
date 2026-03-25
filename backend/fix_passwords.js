const { poolPromise, sql } = require('./database/db');
const bcrypt = require('bcryptjs');

async function fix() {
    try {
        const pool = await poolPromise;
        const res = await pool.request().query('SELECT UserID, Username FROM Users WHERE Username != \'admin\'');
        const users = res.recordset;

        for (const user of users) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash('123456', salt);
            await pool.request()
                .input('Hash', sql.NVarChar, hash)
                .input('UserID', sql.Int, user.UserID)
                .query('UPDATE Users SET PasswordHash = @Hash WHERE UserID = @UserID');
            console.log(`Reset password for ${user.Username} to 123456`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fix();
