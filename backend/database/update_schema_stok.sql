-- MSSQL Schema Update for Stok Kartlari Modulu

-- 1. Create Categories Table
IF OBJECT_ID('dbo.StokKategorileri', 'U') IS NULL
BEGIN
    CREATE TABLE StokKategorileri (
        KategoriID INT PRIMARY KEY IDENTITY(1,1),
        KategoriAdi NVARCHAR(100) NOT NULL UNIQUE,
        Aciklama NVARCHAR(255)
    );
    -- Seed some categories
    INSERT INTO StokKategorileri (KategoriAdi) VALUES ('Genel'), ('Elektronik'), ('Kırtasiye'), ('Hammadde');
END

-- 2. Drop existing Products table if compatibility is not needed or migration is hard (Assuming we can replace for this task)
-- We need to handle foreign keys first. StockMovements references Products.
-- Assuming we interpret 'Products' as the old version of 'StokKartlari'.
-- For this task, I will Create StokKartlari and migrate data if needed, or just replace Products usage.
-- Given the "New Project" context, I will create new tables.

IF OBJECT_ID('dbo.StokKartlari', 'U') IS NULL
BEGIN
    CREATE TABLE StokKartlari (
        StokID INT PRIMARY KEY IDENTITY(1,1),
        StokKodu NVARCHAR(50) NOT NULL UNIQUE,
        StokAdi NVARCHAR(150) NOT NULL,
        Barkod NVARCHAR(50),
        KategoriID INT,
        Marka NVARCHAR(100),
        Model NVARCHAR(100),
        
        -- Units
        AnaBirim NVARCHAR(20) NOT NULL, -- Adet, KG, Litre
        AltBirim NVARCHAR(20),
        
        -- Cost and Price
        AlisFiyati DECIMAL(18, 2) DEFAULT 0,
        SatisFiyati DECIMAL(18, 2) DEFAULT 0,
        KDVOrani INT DEFAULT 18,
        ParaBirimi NVARCHAR(10) DEFAULT 'TL', -- TL, USD, EUR
        
        -- Critical Levels
        MinStokSeviyesi DECIMAL(18, 2) DEFAULT 0,
        MaxStokSeviyesi DECIMAL(18, 2) DEFAULT 0,
        MevcutStok DECIMAL(18, 2) DEFAULT 0, -- Cached current stock
        
        -- Visual
        ResimYolu NVARCHAR(MAX),
        
        OlusturmaTarihi DATETIME DEFAULT GETDATE(),
        GuncellemeTarihi DATETIME,
        
        FOREIGN KEY (KategoriID) REFERENCES StokKategorileri(KategoriID)
    );
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_StokKartlari_Barkod_NotNull' AND object_id = OBJECT_ID('StokKartlari'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_StokKartlari_Barkod_NotNull
    ON StokKartlari(Barkod)
    WHERE Barkod IS NOT NULL;
END
