import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Box, Truck, DollarSign, FileText, ChevronDown, AlignLeft, Tags, Users, UploadCloud, ShoppingCart, FlaskConical, UserCheck, ClipboardList, Wallet, Menu, X, ShieldCheck, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Links matching PvhvErp routes
    const links = [
        { name: 'Panel', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Raporlar', path: '/reports', icon: <FileText size={20} /> },
        { name: 'Ödemeler', path: '/payments', icon: <Wallet size={20} /> },
        { name: 'Cari Hesaplar', path: '/accounts', icon: <DollarSign size={20} /> },
        { name: 'Stok ve Ürünler', path: '/products', icon: <Box size={20} /> },
        { name: 'Kategoriler', path: '/categories', icon: <Tags size={20} /> },
        { name: 'Stok Hareketleri', path: '/stock-movements', icon: <Truck size={20} /> },
        { name: 'Reçeteler (Üretim Planı)', path: '/recipes', icon: <FlaskConical size={20} /> },
        { name: 'Sipariş ve Üretim', path: '/orders-list', icon: <ClipboardList size={20} /> },

        //{ name: 'Tedarikçi Tanımları', path: '/suppliers', icon: <Users size={20} /> }, /*Gerekirse Tekrar Açabiliriz */
        //{ name: 'Müşteri Tanımları', path: '/customers', icon: <UserCheck size={20} /> }, /*Gerekirse Tekrar Açabiliriz */
        { name: 'Fatura Aktar', path: '/import-invoice', icon: <UploadCloud size={20} /> },
        { name: 'Faturalar', path: '/invoices', icon: <FileText size={20} /> },
    ];

    if (user?.role === 'Admin') {
        links.push({ name: 'Kullanıcı Yönetimi', path: '/users', icon: <ShieldCheck size={20} /> });
    }

    const getPageTitle = () => {
        const currentLink = links.find(l => l.path === location.pathname);
        return currentLink ? currentLink.name : 'Panel';
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
        // Page reload can still be kept as a backup or if the user explicitly wants a fresh start,
        // but triggered re-fetches are better for SPA.
        // For now, let's keep the user's logic but make it more powerful.
        // window.location.reload(); 
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`bg-white shadow-xl flex flex-col z-30 fixed h-full transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${isDesktopCollapsed ? 'w-72 md:w-20' : 'w-72'}`}
            >
                <div className="h-16 md:h-24 border-b border-gray-100 flex items-center justify-between md:justify-center px-4 shrink-0 transition-all duration-300">
                    <div className={`text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 ${isDesktopCollapsed ? 'md:hidden' : ''}`}>
                        PvhvErp
                    </div>
                    {isDesktopCollapsed && (
                        <div className="hidden md:block text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                            P
                        </div>
                    )}
                    {/* Close button - Only visible on mobile */}
                    <button
                        className="md:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className={`p-4 flex-1 overflow-y-auto ${isDesktopCollapsed ? 'md:px-2' : ''} transition-all duration-300`}>
                    <div className="mb-6">
                        <p className={`px-4 text-xs font-semibold text-gray-400 uppercase mb-2 ${isDesktopCollapsed ? 'md:hidden' : ''}`}>Menü</p>
                        {links.map((link) => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                onClick={() => setIsSidebarOpen(false)} // Close sidebar on mobile item click
                                className={({ isActive }) => `group relative flex items-center px-4 py-3 rounded-xl transition-all mb-1 ${isDesktopCollapsed ? 'md:justify-center' : 'space-x-3'
                                    } ${isActive ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <div className="shrink-0">{link.icon}</div>
                                <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopCollapsed ? 'md:hidden md:opacity-0 md:w-0' : 'md:opacity-100'}`}>
                                    {link.name}
                                </span>

                                {/* Custom Tooltip for Desktop Collapsed State */}
                                {isDesktopCollapsed && (
                                    <div className="absolute left-full ml-4 px-2 py-1.5 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap pointer-events-none before:content-[''] before:absolute before:top-1/2 before:-translate-y-1/2 before:-left-1 before:border-4 before:border-transparent before:border-r-gray-800">
                                        {link.name}
                                    </div>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </div>

                <div className={`p-4 border-t border-gray-100 mt-auto shrink-0 ${isDesktopCollapsed ? 'md:p-2' : ''} transition-all duration-300`}>
                    <div className={`flex items-center p-3 bg-gray-50 rounded-xl mb-3 ${isDesktopCollapsed ? 'md:justify-center md:px-0' : ''}`}>
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold shrink-0">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className={`ml-3 overflow-hidden transition-all duration-300 ${isDesktopCollapsed ? 'md:hidden' : ''}`}>
                            <p className="text-sm font-medium text-gray-800 truncate">{user?.username}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.role || 'Admin'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`group relative w-full flex items-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium ${isDesktopCollapsed ? 'md:justify-center' : 'justify-center space-x-2'}`}
                    >
                        <LogOut size={18} />
                        <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopCollapsed ? 'md:hidden md:opacity-0 md:w-0' : 'md:opacity-100'}`}>Çıkış Yap</span>

                        {/* Custom Tooltip for Logout */}
                        {isDesktopCollapsed && (
                            <div className="absolute left-full ml-4 px-2 py-1.5 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap pointer-events-none before:content-[''] before:absolute before:top-1/2 before:-translate-y-1/2 before:-left-1 before:border-4 before:border-transparent before:border-r-gray-800">
                                Çıkış Yap
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white h-16 border-b border-gray-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 w-full shadow-sm shrink-0">
                    <div className="flex items-center">
                        {/* Mobile Menu Button */}
                        <button
                            className="p-2 mr-3 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 md:hidden"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>

                        {/* Desktop Toggle Button */}
                        <button
                            className="hidden md:block p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 mr-4"
                            onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
                        >
                            <AlignLeft size={20} />
                        </button>

                        <div className="flex items-center">
                            <h2 className="font-semibold text-gray-800 text-lg">{getPageTitle()}</h2>
                            {/* Small Welcome Text next to Panel */}
                            <div className="hidden md:flex items-center ml-4 pl-4 border-l border-gray-200 gap-1 mt-1">
                                <span className="text-sm font-medium text-gray-600">Hoşgeldiniz, {user?.username}</span>
                                <span className="text-sm text-gray-400">| Yönetim Paneli - PvhvErp</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <button
                            onClick={handleRefresh}
                            className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all duration-200 text-sm font-medium group active:scale-95 shadow-sm hover:shadow"
                            title="Tüm verileri yenile"
                        >
                            <RotateCcw 
                                key={refreshTrigger}
                                size={16} 
                                className={`group-hover:rotate-180 transition-transform duration-500 ${refreshTrigger > 0 ? 'animate-spin-once' : ''}`} 
                            />
                            <span className="hidden md:inline">Verileri Yenile</span>
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-4 md:p-8 bg-gray-50">
                    <Outlet context={{ user, refreshTrigger }} />
                </main>
            </div>
        </div>
    );
};

export default Layout;
