const fs = require('fs');
const path = require('path');
const { poolPromise, sql } = require('./db');
// Ensure it imports from correct place. If require('./db') is inside backend/database/, db.js must be there.
// If backend/database/db.js exists, then fine.
// But the snippet says `const { poolPromise } = require('./db');`
// I need check where db.js is.
// Step 544 showed `const { poolPromise } = require('./database/db');` in `backend/index.js`.
// So db.js is in `backend/database/`.
// So inside `create_customer_orders_runner.js` which is in `backend/database/`, `require('./db')` is correct.
// However `information_schema.tables` failed.

async function createCustomerOrdersTables() {
    try {
        const pool = await poolPromise;
        const sqlContent = fs.readFileSync(path.join(__dirname, 'create_customer_orders.sql'), 'utf8');

        console.log('Executing SQL to create customer order tables...');

        // Execute SQL - If tables exist, this will error. So catch that.
        try {
            await pool.request().query(sqlContent);
            console.log('Tables created successfully.');
        } catch (innerErr) {
            if (innerErr.message.includes('already exists')) {
                console.log('Tables already exist or one of them does.');
            } else {
                console.error(innerErr);
            }
        }

        // Verify tables exist using sys.tables (safer for MSSQL)
        const result = await pool.request().query(`
            SELECT name 
            FROM sys.tables 
            WHERE name IN ('Musteriler', 'MusteriSiparisleri', 'SiparisKalemleri')
        `);

        console.log('Verified Tables:', result.recordset.map(r => r.name));

    } catch (err) {
        console.error('Error creating tables:', err);
    } finally {
        process.exit(0);
    }
}

createCustomerOrdersTables();
