const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./database/db');

async function setupReports() {
    try {
        const pool = await poolPromise;
        const sqlPath = path.join(__dirname, 'database', 'update_schema_reports.sql');
        let sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by GO for MSSQL
        const batches = sql.split(/\bGO\b/i);

        for (let batch of batches) {
            if (batch.trim()) {
                console.log("Executing batch...");
                try {
                    await pool.request().batch(batch);
                } catch (e) {
                    console.error("Batch error:", e.message);
                    // Continue to next batch if error is just "already exists" related
                }
            }
        }
        console.log("Report schema setup finished.");
    } catch (err) {
        console.error("Setup failed:", err);
    } finally {
        process.exit(0);
    }
}

setupReports();
