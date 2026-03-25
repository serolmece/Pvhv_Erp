IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Receteler')
BEGIN
    CREATE TABLE Receteler (
        ReceteID INT IDENTITY(1,1) PRIMARY KEY,
        UrunID INT NOT NULL,
        Aciklama NVARCHAR(MAX),
        OlusturmaTarihi DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (UrunID) REFERENCES StokKartlari(StokID)
    );
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ReceteDetaylari')
BEGIN
    CREATE TABLE ReceteDetaylari (
        DetayID INT IDENTITY(1,1) PRIMARY KEY,
        ReceteID INT NOT NULL,
        HammaddeID INT NOT NULL,
        Miktar DECIMAL(18, 4),
        Birim NVARCHAR(50),
        FOREIGN KEY (ReceteID) REFERENCES Receteler(ReceteID),
        FOREIGN KEY (HammaddeID) REFERENCES StokKartlari(StokID)
    );
END;
