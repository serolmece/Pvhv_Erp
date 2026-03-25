require('dotenv').config({ path: '../.env' }); // or load from backend/.env
const { poolPromise, sql } = require('./db');

async function alter() {
    try {
        const pool = await poolPromise;
        const query = `
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE Name = N'MusteriID' AND Object_ID = Object_ID(N'Receteler')
            )
            BEGIN
                ALTER TABLE Receteler ADD MusteriID INT NULL;
                ALTER TABLE Receteler ADD CONSTRAINT FK_Receteler_Musteriler FOREIGN KEY (MusteriID) REFERENCES Musteriler(MusteriID);
                SELECT 'MusteriID eklendi.' AS Message;
            END ELSE BEGIN
                SELECT 'MusteriID zaten var.' AS Message;
            END
        `;
        const result = await pool.request().query(query);
        console.log(result.recordset ? result.recordset : "Alter executed.");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}
alter();
