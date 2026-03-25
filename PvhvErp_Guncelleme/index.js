const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { poolPromise } = require('./database/db');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const accountRoutes = require('./routes/accountRoutes');
const stockMovementRoutes = require('./routes/stockMovementRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const stockCardRoutes = require('./routes/stockCardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const invoiceImportRoutes = require('./routes/invoiceImportRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const customerRoutes = require('./routes/customerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const otherAccountRoutes = require('./routes/otherAccountRoutes');
const userRoutes = require('./routes/userRoutes');
const diagRoutes = require('./routes/diagRoutes');



dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// URL Rewrite Middleware for Plesk IISNode compatibility
// Strips the default index.js handler path so Express routing works normally
app.use((req, res, next) => {
    if (req.url.startsWith('/index.js')) {
        req.url = req.url.replace('/index.js', '');
    }
    next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/stock-movements', stockMovementRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/stock-cards', stockCardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/import', invoiceImportRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/other-accounts', otherAccountRoutes);
app.use('/api/users', userRoutes);
app.use('/api/diag', diagRoutes);


// Serve Frontend (React)
// Plesk Node.js eklentisi kullanıldığı için tüm dosyalar Node.js üzerinden sunulacak
const frontendPath = path.join(__dirname, 'public');
app.use(express.static(frontendPath));
app.use('/assets', express.static(path.join(frontendPath, 'assets')));

app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const startServer = async () => {
    try {
        await poolPromise; // Ensure DB connection works
        console.log('Database connected successfully.');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
};

startServer();
