const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./database/db');

const updateDb = async () => {
    try {
        const pool = await poolPromise;
        const schemaPath = path.join(__dirname, 'database', 'update_schema_suppliers_iban.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        const batches = schemaSql.split(/\nGO\s*\n?/i).filter(b => b.trim().length > 0);
        console.log(`Found ${batches.length} batches to execute.`);

        for (const batch of batches) {
            console.log('Executing batch...');
            try {
                await pool.request().query(batch);
            } catch (err) {
                console.error('Error executing batch:', err.message);
                throw err;
            }
        }

        console.log('Database updated successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Fatal error updating schema:', err);
        process.exit(1);
    }
};

updateDb();
