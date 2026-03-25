import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Box, Truck, DollarSign, FileText, Users, UploadCloud, FlaskConical, UserCheck, ClipboardList, TrendingUp } from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();

    const links = [
        { name: 'Panel', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Stok ve Ürünler', path: '/products', icon: <Box size={20} /> },
        { name: 'Kategoriler', path: '/categories', icon: <Box size={20} /> },
        { name: 'Stok Hareketleri', path: '/stock-movements', icon: <Truck size={20} /> },
        { name: 'Reçeteler (Üretim Planı)', path: '/recipes', icon: <FlaskConical size={20} /> },
        { name: 'Sipariş ve Üretim', path: '/orders-list', icon: <ClipboardList size={20} /> },
        { name: 'Tedarikçi Tanımları', path: '/suppliers', icon: <Users size={20} /> },
        { name: 'Müşteri Tanımları', path: '/customers', icon: <UserCheck size={20} /> },
        { name: 'Fatura Aktar', path: '/import-invoice', icon: <UploadCloud size={20} /> },
        { name: 'Cari Hesaplar', path: '/accounts', icon: <DollarSign size={20} /> },
        { name: 'Faturalar', path: '/invoices', icon: <FileText size={20} /> },
        { name: 'Stok Raporları', path: '/reports', icon: <TrendingUp size={20} /> },
    ];

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>PvhvErp</h1>
                </Link>
            </div>
            <nav className="sidebar-nav">
                {links.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        className={`sidebar-link ${location.pathname === link.path ? 'active' : ''}`}
                    >
                        <span className="sidebar-icon">{link.icon}</span>
                        {link.name}
                    </Link>
                ))}
            </nav>
        </div>
    );
};

export default Sidebar;
