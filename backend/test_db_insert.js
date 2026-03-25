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
        .input('StokKodu', sql.NVarChar, 'TESTDB')
        .input('SatisFiyati', sql.Decimal(18, 2), 4113.85) // JS Native Number
        .query("INSERT INTO StokKartlari (StokKodu, StokAdi, AnaBirim, SatisFiyati) VALUES (@StokKodu, 'TEST DB', 'Adet', @SatisFiyati); SELECT SCOPE_IDENTITY() as Id");
}).then(result => {
    const id = result.recordset[0].Id;
    return sql.query(`SELECT SatisFiyati FROM StokKartlari WHERE StokID = ${id}`);
}).then(result2 => {
    console.log("DB FETCH: ", result2.recordset[0]);
    return sql.query(`DELETE FROM StokKartlari WHERE StokKodu = 'TESTDB'`);
}).then(() => {
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
