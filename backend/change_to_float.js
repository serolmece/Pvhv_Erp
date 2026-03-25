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

const tables = {
    'StokKartlari': ['AlisFiyati', 'SatisFiyati', 'MinStokSeviyesi', 'MaxStokSeviyesi', 'MevcutStok'],
    'StokHareketleri': ['Miktar', 'BirimFiyat', 'ToplamTutar'],
    'SiparisKalemleri': ['Miktar'],
    'ReceteDetaylari': ['Miktar', 'HedefUrunAdedi'],
    'UretimTakibi': ['UretilenMiktar'],
    'Odemeler': ['Tutar'],
    'Payments': ['Amount'],
    'Invoices': ['TotalAmount'],
    'DigerCariler': ['Bakiye'],
    'PeriyodikAyarlar': ['Tutar'],
    'Products': ['CriticalStockLevel'],
    'Tedarikciler': ['CariBakiye']
};

sql.connect(config).then(async pool => {
    for (const [table, cols] of Object.entries(tables)) {
        for (const col of cols) {
            try {
                // Drop any default constraints first, otherwise ALTER COLUMN fails
                // But usually float doesn't care unless there's an index or dependent object
                const conCheck = await pool.request().query(`
                    SELECT d.name 
                    FROM sys.default_constraints d 
                    INNER JOIN sys.columns c ON d.parent_object_id = c.object_id AND d.parent_column_id = c.column_id 
                    WHERE d.parent_object_id = OBJECT_ID('${table}') AND c.name = '${col}'
                `);

                if (conCheck.recordset.length > 0) {
                    await pool.request().query(`ALTER TABLE [${table}] DROP CONSTRAINT [${conCheck.recordset[0].name}]`);
                }

                await pool.request().query(`ALTER TABLE [${table}] ALTER COLUMN [${col}] FLOAT`);
                console.log(`Changed ${table}.${col} to FLOAT`);
            } catch (err) {
                console.error(`Error on ${table}.${col}: `, err.message);
                // Try removing from view dependants?
            }
        }
    }

    // Refresh viewvw_StokRaporu
    try {
        await pool.request().query("EXEC sp_refreshview 'vw_StokRaporu'");
        console.log("Refreshed vw_StokRaporu");
    } catch (e) { }

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
