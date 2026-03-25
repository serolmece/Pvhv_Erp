CREATE TABLE Musteriler (
    MusteriID INT IDENTITY(1,1) PRIMARY KEY,
    Unvan NVARCHAR(255) NOT NULL,
    VKN NVARCHAR(50),
    Adres NVARCHAR(MAX),
    Iletisim NVARCHAR(255),
    OlusturmaTarihi DATETIME DEFAULT GETDATE()
);

CREATE TABLE MusteriSiparisleri (
    SiparisID INT IDENTITY(1,1) PRIMARY KEY,
    MusteriID INT NOT NULL,
    SiparisTarihi DATETIME DEFAULT GETDATE(),
    TeslimTarihi DATETIME,
    Durum NVARCHAR(50) DEFAULT 'Beklemede', -- Beklemede, Üretimde, Tamamlandı
    FOREIGN KEY (MusteriID) REFERENCES Musteriler(MusteriID)
);

CREATE TABLE SiparisKalemleri (
    KalemID INT IDENTITY(1,1) PRIMARY KEY,
    SiparisID INT NOT NULL,
    UrunID INT NOT NULL,
    Miktar DECIMAL(18, 4),
    OzelReceteID INT, -- Bu siparişe özel reçete (Opsiyonel)
    FOREIGN KEY (SiparisID) REFERENCES MusteriSiparisleri(SiparisID),
    FOREIGN KEY (UrunID) REFERENCES StokKartlari(StokID),
    FOREIGN KEY (OzelReceteID) REFERENCES Receteler(ReceteID)
);
