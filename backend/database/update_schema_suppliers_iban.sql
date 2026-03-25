-- Add IBAN to Tedarikciler
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Tedarikciler') AND name = 'IBAN')
BEGIN
    ALTER TABLE Tedarikciler ADD IBAN NVARCHAR(50);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Tedarikciler') AND name = 'BankaAdi')
BEGIN
    ALTER TABLE Tedarikciler ADD BankaAdi NVARCHAR(100);
END
GO
