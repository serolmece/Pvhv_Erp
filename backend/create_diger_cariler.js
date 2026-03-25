const { sql, poolPromise } = require('./database/db');

async function createTable() {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DigerCariler' and xtype='U')
            BEGIN
                CREATE TABLE DigerCariler (
                    CariID INT PRIMARY KEY IDENTITY(1,1),
                    Unvan NVARCHAR(255) NOT NULL,
                    VergiNo NVARCHAR(50),
                    VergiDairesi NVARCHAR(100),
                    Adres NVARCHAR(MAX),
                    Iletisim NVARCHAR(255),
                    Eposta NVARCHAR(255),
                    Bakiye DECIMAL(18,2) DEFAULT 0,
                    OlusturmaTarihi DATETIME DEFAULT GETDATE(),
                    GuncellemeTarihi DATETIME DEFAULT GETDATE()
                )
                PRINT 'DigerCariler table created.'
            END
            ELSE
            BEGIN
                PRINT 'DigerCariler table already exists.'
            END
        `);
        console.log("Migration successful");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

createTable();
