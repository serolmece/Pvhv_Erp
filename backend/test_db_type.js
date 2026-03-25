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
        .query("SELECT TOP 5 StokID, StokAdi, AlisFiyati, SatisFiyati FROM StokKartlari ORDER BY StokID DESC");
}).then(result => {
    console.table(result.recordset);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
