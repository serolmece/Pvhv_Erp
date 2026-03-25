const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./database/db');

const setupDb = async () => {
    try {
        const pool = await poolPromise;
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by 'GO' if present, otherwise just execute. 
        // Simple regex to split by generated GO or just standard statements.
        // My schema.sql didn't use GO, but let's be safe and split by semicolon if needed or just run as batch.
        // MSSQL driver usually handles batch if no GO.

        // However, some T-SQL commands must be in their own batch.
        // Let's try running it as a single batch first, if it fails, we might need to split.
        // But CREATE TABLE usually works in one batch in standard SQL (not T-SQL strict mode).

        console.log('Executing schema...');
        await pool.request().query(schemaSql);
        console.log('Database setup completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error setting up database:', err);
        process.exit(1);
    }
};

setupDb();
