-- MSSQL Schema for Stock Reporting Module

-- 1. Create a View for Detailed Stock Report (Envanter Özeti)
IF OBJECT_ID('dbo.vw_StokRaporu', 'V') IS NOT NULL DROP VIEW dbo.vw_StokRaporu;
GO

CREATE VIEW vw_StokRaporu AS
SELECT 
    sk.StokID,
    sk.StokKodu,
    sk.StokAdi,
    sk.Marka,
    kat.KategoriAdi,
    sk.AnaBirim,
    sk.MevcutStok,
    sk.MinStokSeviyesi,
    sk.ParaBirimi,
    
    -- Average Purchase Price (Simple average of IN movements price or Card Price if no movement)
    -- Using ISNULL(AVG(NULLIF(sh.BirimFiyat, 0)), sk.AlisFiyati) for simplicity.
    ISNULL((
        SELECT AVG(BirimFiyat) 
        FROM StokHareketleri 
        WHERE StokID = sk.StokID AND HareketTipi = 'Giris' AND BirimFiyat > 0
    ), sk.AlisFiyati) AS OrtalamaAlisFiyati,
    
    -- Inventory Value (MevcutStok * AvgPrice)
    (sk.MevcutStok * ISNULL((
        SELECT AVG(BirimFiyat) 
        FROM StokHareketleri 
        WHERE StokID = sk.StokID AND HareketTipi = 'Giris' AND BirimFiyat > 0
    ), sk.AlisFiyati)) AS ToplamEnvanterDegeri,
    
    -- Total IN Quantity
    ISNULL((
        SELECT SUM(Miktar) 
        FROM StokHareketleri 
        WHERE StokID = sk.StokID AND HareketTipi = 'Giris'
    ), 0) AS ToplamGirisMiktar,
    
    -- Total OUT Quantity
    ISNULL((
        SELECT SUM(Miktar) 
        FROM StokHareketleri 
        WHERE StokID = sk.StokID AND HareketTipi = 'Cikis'
    ), 0) AS ToplamCikisMiktar,
    
    -- Last Movement Date
    (SELECT MAX(Tarih) FROM StokHareketleri WHERE StokID = sk.StokID) AS SonHareketTarihi

FROM StokKartlari sk
LEFT JOIN StokKategorileri kat ON sk.KategoriID = kat.KategoriID;
GO

-- 2. Stored Procedure for Dashboard Analytics (Flexible Date Range filtering)
IF OBJECT_ID('dbo.sp_StokAnaliz', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_StokAnaliz;
GO

CREATE PROCEDURE sp_StokAnaliz
    @StartDate DATETIME = NULL,
    @EndDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Default to wide range if null
    IF @StartDate IS NULL SET @StartDate = '1900-01-01';
    IF @EndDate IS NULL SET @EndDate = GETDATE();

    -- Return 3 Result Sets

    -- 1. General Stats (Total Value, Critical Count)
    SELECT 
        SUM(ToplamEnvanterDegeri) AS ToplamStokDegeri,
        (SELECT COUNT(*) FROM vw_StokRaporu WHERE MevcutStok <= MinStokSeviyesi) AS KritikUrunSayisi
    FROM vw_StokRaporu;

    -- 2. Top 5 Sold/Out Products (quantity based)
    SELECT TOP 5
        sk.StokAdi,
        SUM(sh.Miktar) as ToplamCikis
    FROM StokHareketleri sh
    JOIN StokKartlari sk ON sh.StokID = sk.StokID
    WHERE sh.HareketTipi = 'Cikis' 
      AND sh.Tarih BETWEEN @StartDate AND @EndDate
    GROUP BY sk.StokAdi
    ORDER BY SUM(sh.Miktar) DESC;

    -- 3. Inactive Products (No OUT movement in range)
    SELECT 
        sk.StokKodu,
        sk.StokAdi,
        sk.MevcutStok,
        (SELECT MAX(Tarih) FROM StokHareketleri WHERE StokID = sk.StokID) as SonHareket
    FROM StokKartlari sk
    WHERE NOT EXISTS (
        SELECT 1 FROM StokHareketleri sh 
        WHERE sh.StokID = sk.StokID 
          AND sh.HareketTipi = 'Cikis'
          AND sh.Tarih BETWEEN @StartDate AND @EndDate
    );
END
GO
