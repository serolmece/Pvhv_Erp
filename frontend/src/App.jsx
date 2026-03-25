import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import StockCategories from './pages/StockCategories';
import Suppliers from './pages/Suppliers';
import InvoiceImport from './pages/InvoiceImport';
import Recipes from './pages/Recipes';
import OrderEntry from './pages/OrderEntry';
import OrdersList from './pages/OrdersList';

import Customers from './pages/Customers';
import Products from './pages/Products';
import StockMovements from './pages/StockMovements';
import StockReports from './pages/StockReports';
import Payments from './pages/Payments';
import Accounts from './pages/Accounts';
import Users from './pages/Users';
const Invoices = () => <div className="p-4 bg-white rounded shadow"><h2>Fatura Yönetimi (Yakında)</h2></div>;

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<StockCategories />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/import-invoice" element={<InvoiceImport />} />
            <Route path="/stock-movements" element={<StockMovements />} />
            <Route path="/reports" element={<StockReports />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/orders" element={<OrderEntry />} />
            <Route path="/orders-list" element={<OrdersList />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/users" element={<Users />} />


          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
