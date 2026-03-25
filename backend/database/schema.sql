-- MSSQL Schema for PvhvErp
-- Cleanup existing tables in reverse dependency order
IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL DROP TABLE dbo.Payments;
IF OBJECT_ID('dbo.Invoices', 'U') IS NOT NULL DROP TABLE dbo.Invoices;
IF OBJECT_ID('dbo.StockMovements', 'U') IS NOT NULL DROP TABLE dbo.StockMovements;
IF OBJECT_ID('dbo.Products', 'U') IS NOT NULL DROP TABLE dbo.Products;
IF OBJECT_ID('dbo.Accounts', 'U') IS NOT NULL DROP TABLE dbo.Accounts;
IF OBJECT_ID('dbo.Warehouses', 'U') IS NOT NULL DROP TABLE dbo.Warehouses;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL DROP TABLE dbo.Roles;
IF OBJECT_ID('dbo.UnitTypes', 'U') IS NOT NULL DROP TABLE dbo.UnitTypes;

-- Roles Table
CREATE TABLE Roles (
    RoleID INT PRIMARY KEY IDENTITY(1,1),
    RoleName NVARCHAR(50) NOT NULL UNIQUE
);

-- Users Table
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    RoleID INT NOT NULL,
    Fullname NVARCHAR(100),
    Email NVARCHAR(100) UNIQUE,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
);

-- Unit Types (Optional, can be hardcoded but good for extendibility)
CREATE TABLE UnitTypes (
    UnitID INT PRIMARY KEY IDENTITY(1,1),
    UnitName NVARCHAR(50) NOT NULL UNIQUE -- e.g., 'Adet', 'Kg', 'Litre'
);

-- Products Table
CREATE TABLE Products (
    ProductID INT PRIMARY KEY IDENTITY(1,1),
    ProductName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255),
    UnitID INT NOT NULL,
    CriticalStockLevel DECIMAL(18, 2) DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UnitID) REFERENCES UnitTypes(UnitID)
);

-- Warehouses (Optional, keeping simple for now but good structure)
CREATE TABLE Warehouses (
    WarehouseID INT PRIMARY KEY IDENTITY(1,1),
    WarehouseName NVARCHAR(100) NOT NULL,
    Location NVARCHAR(255)
);

-- Stock Movements
CREATE TABLE StockMovements (
    MovementID INT PRIMARY KEY IDENTITY(1,1),
    ProductID INT NOT NULL,
    WarehouseID INT NOT NULL,
    MovementType NVARCHAR(10) NOT NULL CHECK (MovementType IN ('IN', 'OUT')),
    Quantity DECIMAL(18, 2) NOT NULL,
    MovementDate DATETIME DEFAULT GETDATE(),
    UserID INT NOT NULL, -- Who made the movement
    Notes NVARCHAR(255),
    FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
    FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- Accounts (Cari Hesaplary)
CREATE TABLE Accounts (
    AccountID INT PRIMARY KEY IDENTITY(1,1),
    AccountName NVARCHAR(100) NOT NULL,
    TaxNumber NVARCHAR(50),
    Address NVARCHAR(255),
    Phone NVARCHAR(20),
    Email NVARCHAR(100),
    AccountType NVARCHAR(20) CHECK (AccountType IN ('CUSTOMER', 'SUPPLIER')),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Invoices
CREATE TABLE Invoices (
    InvoiceID INT PRIMARY KEY IDENTITY(1,1),
    AccountID INT NOT NULL,
    InvoiceNumber NVARCHAR(50) UNIQUE,
    InvoiceDate DATE NOT NULL,
    DueDate DATE NOT NULL,
    TotalAmount DECIMAL(18, 2) NOT NULL,
    InvoiceType NVARCHAR(10) CHECK (InvoiceType IN ('INCOMING', 'OUTGOING')), -- Gelen/Giden
    PaymentStatus NVARCHAR(20) DEFAULT 'PENDING' CHECK (PaymentStatus IN ('PAID', 'PENDING', 'OVERDUE')),
    Description NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (AccountID) REFERENCES Accounts(AccountID)
);

-- Payments (Tahsilat ve Ödemeler)
CREATE TABLE Payments (
    PaymentID INT PRIMARY KEY IDENTITY(1,1),
    InvoiceID INT NOT NULL,
    PaymentDate DATETIME DEFAULT GETDATE(),
    Amount DECIMAL(18, 2) NOT NULL,
    PaymentMethod NVARCHAR(50), -- Bank Transfer, Cash, etc.
    Notes NVARCHAR(255),
    FOREIGN KEY (InvoiceID) REFERENCES Invoices(InvoiceID)
);

-- Initial Data Seeding
INSERT INTO Roles (RoleName) VALUES ('Admin'), ('Manager'), ('User');
INSERT INTO UnitTypes (UnitName) VALUES ('Adet'), ('Kg'), ('Litre');
INSERT INTO Warehouses (WarehouseName, Location) VALUES ('Merkez Depo', 'Merkez');
