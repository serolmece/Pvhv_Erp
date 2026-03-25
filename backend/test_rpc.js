require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT, 10),
    options: { encrypt: false, trustServerCertificate: true }
};

sql.connect(config).then(pool => {
    return pool.request()
        .input('Test1', sql.Decimal(18, 2), 4113.85) // As JS number
        .input('Test2', sql.Decimal(18, 2), "4113.85") // As String
        .input('Test3', sql.Float, 4113.85)
        .input('Test4', sql.Float, "4113.85")
        .query('SELECT @Test1 as T1, @Test2 as T2, @Test3 as T3, @Test4 as T4');
}).then(result => {
    console.table(result.recordset);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
