const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT, 10),
    options: {
        encrypt: process.env.NODE_ENV === 'production',
        trustServerCertificate: true
    }
};

(async () => {
    try {
        let pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'ReceteDetaylari'
        `);
        console.log(result.recordset);
    } catch (err) {
        console.error("Query failed:", err);
    } finally {
        sql.close();
    }
})();
