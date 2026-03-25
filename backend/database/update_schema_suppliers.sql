-- Tedarikci Yonetimi Schema

IF OBJECT_ID('dbo.Tedarikciler', 'U') IS NULL
BEGIN
    CREATE TABLE Tedarikciler (
        TedarikciID INT PRIMARY KEY IDENTITY(1,1),
        TedarikciAdi NVARCHAR(200) NOT NULL,
        VergiNo NVARCHAR(11),
        VergiDairesi NVARCHAR(100),
        Eposta NVARCHAR(100),
        Telefon NVARCHAR(20),
        Adres NVARCHAR(MAX),
        CariBakiye DECIMAL(18,2) DEFAULT 0,
        OlusturmaTarihi DATETIME DEFAULT GETDATE(),
        GuncellemeTarihi DATETIME DEFAULT GETDATE()
    );
END
GO
