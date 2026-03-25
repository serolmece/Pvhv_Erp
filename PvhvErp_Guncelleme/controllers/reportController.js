const { poolPromise, sql } = require('../database/db');
const XLSX = require('xlsx');

// 1. Get Detailed Inventory Report (vw_StokRaporu)
exports.getInventoryReport = async (req, res) => {
    try {
        const { startDate, endDate, categoryId, brand } = req.query;
        const pool = await poolPromise;

        let query = `SELECT * FROM vw_StokRaporu WHERE 1=1`;

        // Note: View doesn't have Movement dates natively for ranges, usually Inventory is "As of Now".
        // But we can filter by Category/Brand easily.
        if (categoryId) query += ` AND KategoriID = @CategoryId`;
        if (brand) query += ` AND Marka LIKE @Brand`;

        query += ` ORDER BY ToplamEnvanterDegeri DESC`;

        const request = pool.request();
        if (categoryId) request.input('CategoryId', sql.Int, categoryId);
        if (brand) request.input('Brand', sql.NVarChar, `%${brand}%`);

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error("getInventoryReport error:", err);
        res.status(400).json({ message: err.message });
    }
};

// 2. Get Dashboard Stats (Totals, Top Sold)
exports.getDashboardStats = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                SUM(ToplamEnvanterDegeri) as TotalValue,
                (SELECT COUNT(*) FROM vw_StokRaporu WHERE MevcutStok <= MinStokSeviyesi) as CriticalCount,
                (SELECT count(*) FROM StokKartlari) as TotalProducts
            FROM vw_StokRaporu
        `);

        // Top 5 Sold
        const topSold = await pool.request().query(`
            SELECT TOP 5 sk.StokAdi, SUM(sh.Miktar) as Value
            FROM StokHareketleri sh
            JOIN StokKartlari sk ON sh.StokID = sk.StokID
            WHERE sh.HareketTipi = 'Cikis'
            GROUP BY sk.StokAdi
            ORDER BY Value DESC
        `);

        res.json({
            stats: result.recordset[0],
            topSold: topSold.recordset
        });
    } catch (err) {
        console.error("getDashboardStats error:", err);
        res.status(400).json({ message: err.message });
    }
};

// 3. Export to Excel (Backend generated)
exports.exportToExcel = async (req, res) => {
    try {
        // Fetch all data or filtered
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM vw_StokRaporu');

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(result.recordset);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'StokRaporu');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=StokRaporu.xlsx');
        res.send(buffer);
    } catch (err) {
        console.error("exportToExcel error:", err);
        res.status(400).json({ message: err.message });
    }
};
