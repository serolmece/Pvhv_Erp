const sql = require('mssql');

const config = {
    user: 'sa',
    password: '99Gnrx!',
    server: 'localhost',
    database: 'PvhvErp',
    port: 1433,
    options: {
        encrypt: false,
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
