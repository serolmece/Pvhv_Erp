const { poolPromise, sql } = require('./database/db');
const bcrypt = require('bcryptjs');

const checkUser = async () => {
    try {
        const pool = await poolPromise;
        const username = 'admin';
        const passwordToTest = '20152019';

        console.log(`Checking user: ${username}`);

        const result = await pool.request()
            .input('Username', sql.NVarChar, username)
            .query('SELECT * FROM Users WHERE Username = @Username');

        const user = result.recordset[0];

        if (!user) {
            console.log('User NOT found in database.');
        } else {
            console.log('User found:', user.Username);
            console.log('Stored Hash:', user.PasswordHash);

            const isMatch = await bcrypt.compare(passwordToTest, user.PasswordHash);
            console.log(`Password '${passwordToTest}' match result: ${isMatch}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

checkUser();
