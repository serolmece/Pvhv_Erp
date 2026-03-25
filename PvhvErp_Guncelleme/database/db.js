const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false, // Use true if you're on Azure
        trustServerCertificate: true, // Use true for local dev / self-signed certs
        enableArithAbort: true
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Connected to MSSQL');
        return pool;
    })
    .catch(err => {
        console.error('Database Connection Failed! Bad Config: ', err);
        // Throw a specific error object we can pattern match
        throw { type: 'DB_CONNECTION_ERROR', originalError: err.message, stack: err.stack };
    });

module.exports = {
    sql,
    poolPromise
};
