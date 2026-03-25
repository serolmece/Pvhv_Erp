const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT, 10),
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

(async () => {
    try {
        let pool = await sql.connect(config);
        console.log("Connected...");
        
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
