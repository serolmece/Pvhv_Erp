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

sql.connect(config).then(async pool => {
    try {
        await pool.request().query(`DROP VIEW vw_StokRaporu`);
        console.log("Dropped view vw_StokRaporu");
    } catch (e) { console.error(e.message); }

    try {
        await pool.request().query(`DROP TRIGGER trg_UpdateStokOnMovement`);
        console.log("Dropped trigger trg_UpdateStokOnMovement");
    } catch (e) { console.error(e.message); }

    try {
        await pool.request().query(`ALTER TABLE [StokHareketleri] ALTER COLUMN [Miktar] FLOAT`);
        console.log("Changed StokHareketleri.Miktar to FLOAT");
    } catch (e) { console.error(e.message); }

    try {
        await pool.request().query(`ALTER TABLE [StokKartlari] ALTER COLUMN [MevcutStok] FLOAT`);
        console.log("Changed StokKartlari.MevcutStok to FLOAT");
    } catch (e) { console.error(e.message); }

    // Recreate trigger
    try {
        await pool.request().query(`
        CREATE TRIGGER [dbo].[trg_UpdateStokOnMovement]
        ON [dbo].[StokHareketleri]
        AFTER INSERT, DELETE, UPDATE
        AS
        BEGIN
            SET NOCOUNT ON;
            
            -- Hata ayıklama veya trigger çalışmasını izlemek gerekebilir (isteğe bağlı)
            
            -- Mevcut stoku yeniden hesapla (Tüm Stoku Baştan Hesaplama veya sadece ilgili satırları güncelleme)
            -- Sadece etkilenen StokID'leri güncelle!
            UPDATE sk
            SET sk.MevcutStok = ISNULL((
                SELECT SUM(
                    CASE 
                        WHEN HareketTipi = 'Giris' THEN Miktar
                        WHEN HareketTipi = 'Cikis' THEN -Miktar
                        ELSE 0
                    END
                )
                FROM StokHareketleri
                WHERE StokID = sk.StokID
            ), 0)
            FROM StokKartlari sk
            WHERE sk.StokID IN (SELECT StokID FROM INSERTED UNION SELECT StokID FROM DELETED)
        END
        `);
        console.log("Recreated trigger trg_UpdateStokOnMovement");
    } catch (e) { console.error(e.message); }

    // Recreate view
    try {
        await pool.request().query(`
        CREATE VIEW [dbo].[vw_StokRaporu] AS
        SELECT 
            sk.StokID,
            sk.StokKodu,
            sk.StokAdi,
            kat.KategoriAdi,
            sk.MevcutStok,
            sk.MinStokSeviyesi,
            
            -- Ortalama Alış Fiyatı (Tüm Girişlerin Toplam Tutarı / Toplam Giriş Miktarı)
            ISNULL((
                SELECT SUM(Miktar * BirimFiyat) / NULLIF(SUM(Miktar), 0) 
                FROM StokHareketleri 
                WHERE StokID = sk.StokID AND HareketTipi = 'Giris'
            ), sk.AlisFiyati) AS OrtalamaAlisFiyati,
            
            -- Toplam Envanter Değeri (Mevcut Stok * Ortalama Alış veya Son Alış Fiyatı)
            sk.MevcutStok * ISNULL((
                SELECT SUM(Miktar * BirimFiyat) / NULLIF(SUM(Miktar), 0) 
                FROM StokHareketleri 
                WHERE StokID = sk.StokID AND HareketTipi = 'Giris'
            ), sk.AlisFiyati) AS ToplamEnvanterDegeri,

            -- Toplam Giriş Miktarı
            ISNULL((SELECT SUM(Miktar) FROM StokHareketleri WHERE StokID = sk.StokID AND HareketTipi = 'Giris'), 0) AS ToplamGirisMiktar,
            
            -- Toplam Çıkış Miktarı
            ISNULL((SELECT SUM(Miktar) FROM StokHareketleri WHERE StokID = sk.StokID AND HareketTipi = 'Cikis'), 0) AS ToplamCikisMiktar
            
        FROM 
            StokKartlari sk
        LEFT JOIN 
            StokKategorileri kat ON sk.KategoriID = kat.KategoriID
        `);
        console.log("Recreated view vw_StokRaporu");
    } catch (e) { console.error(e.message); }

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
