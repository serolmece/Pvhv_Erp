-- Stok Hareketleri Modulu Schema

-- 1. StokHareketleri Tablosu
IF OBJECT_ID('dbo.StokHareketleri', 'U') IS NULL
BEGIN
    CREATE TABLE StokHareketleri (
        HareketID INT PRIMARY KEY IDENTITY(1,1),
        StokID INT NOT NULL,
        CariID INT, -- Tedarikçi veya Müşteri ID (Accounts table assummed or loose link for now)
        HareketTipi NVARCHAR(10) NOT NULL CHECK (HareketTipi IN ('Giris', 'Cikis')), -- 'Cikis' is standard ASCII for 'Çıkış' to avoid collation headaches, UI can map it.
        Miktar DECIMAL(18, 2) NOT NULL CHECK (Miktar > 0),
        BirimFiyat DECIMAL(18, 2) DEFAULT 0,
        KDVOrani INT DEFAULT 18,
        ToplamTutar DECIMAL(18, 2) DEFAULT 0,
        BelgeNo NVARCHAR(50), -- STK20260215-001 format logic controlled by app
        Tarih DATETIME DEFAULT GETDATE(),
        Aciklama NVARCHAR(255),
        
        FOREIGN KEY (StokID) REFERENCES StokKartlari(StokID)
    );
END

-- 2. Negatif Stok Engeli (Constraint on StokKartlari)
-- MevcutStok verisinin eksiye düşmesini veritabanı seviyesinde engeller.
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_StokKartlari_NoNegativeStock')
BEGIN
    ALTER TABLE StokKartlari
    ADD CONSTRAINT CHK_StokKartlari_NoNegativeStock CHECK (MevcutStok >= 0);
END

-- 3. Trigger: Otomatik Stok Güncelleme
-- Hareket tablosuna ekleme yapıldığında StokKartlari tablosunu günceller.
IF OBJECT_ID('trg_StokHareketleri_UpdateStock', 'TR') IS NOT NULL
DROP TRIGGER trg_StokHareketleri_UpdateStock;
GO

CREATE TRIGGER trg_StokHareketleri_UpdateStock
ON StokHareketleri
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- Giriş İşlemi: Stok Arttır
    UPDATE s
    SET s.MevcutStok = ISNULL(s.MevcutStok, 0) + i.Miktar,
        s.GuncellemeTarihi = GETDATE(),
        -- Son Alış Fiyatını Güncelle (Sadece Giriş işleminde ve fiyat > 0 ise)
        s.AlisFiyati = CASE WHEN i.HareketTipi = 'Giris' AND i.BirimFiyat > 0 THEN i.BirimFiyat ELSE s.AlisFiyati END
    FROM StokKartlari s
    INNER JOIN inserted i ON s.StokID = i.StokID
    WHERE i.HareketTipi = 'Giris';

    -- Çıkış İşlemi: Stok Azalt
    UPDATE s
    SET s.MevcutStok = ISNULL(s.MevcutStok, 0) - i.Miktar,
        s.GuncellemeTarihi = GETDATE()
    FROM StokKartlari s
    INNER JOIN inserted i ON s.StokID = i.StokID
    WHERE i.HareketTipi = 'Cikis';
END
GO
