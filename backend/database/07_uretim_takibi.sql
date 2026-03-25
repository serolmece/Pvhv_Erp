CREATE TABLE UretimTakibi (
    UretimID INT IDENTITY(1,1) PRIMARY KEY,
    SiparisID INT NOT NULL,
    KalemID INT NOT NULL,
    UretimTarihi DATETIME DEFAULT GETDATE(),
    UretilenMiktar DECIMAL(18, 4) NOT NULL,
    EkleyenKullanici INT NULL, -- Orijinal yapıda varsa, yoksa opsiyonel eklenebilir
    FOREIGN KEY (SiparisID) REFERENCES MusteriSiparisleri(SiparisID),
    FOREIGN KEY (KalemID) REFERENCES SiparisKalemleri(KalemID)
);
