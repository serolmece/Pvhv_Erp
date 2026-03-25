const { poolPromise, sql } = require('./database/db');

(async () => {
    try {
        const pool = await poolPromise;
        console.log("Direct connection acquired.");
        
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE Name = N'HedefUrunAdedi' AND Object_ID = Object_ID(N'ReceteDetaylari')
            )
            BEGIN
                ALTER TABLE ReceteDetaylari ADD HedefUrunAdedi DECIMAL(18,2) NOT NULL DEFAULT 1;
                PRINT 'Column HedefUrunAdedi added';
            END
            ELSE
            BEGIN
                PRINT 'Column HedefUrunAdedi already exists';
            END
        `);
        console.log("Migration complete.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        sql.close();
    }
})();
