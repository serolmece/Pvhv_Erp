import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Grid, Printer, Download, Filter,
    TrendingUp, TrendingDown, AlertTriangle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import api from '../api/axios';
import * as XLSX from 'xlsx';

const StockReports = () => {
    const [reportData, setReportData] = useState([]);
    const [stats, setStats] = useState({ TotalValue: 0, CriticalCount: 0 });
    const [topSold, setTopSold] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rates, setRates] = useState({ USD: 0, EUR: 0 });

    // Filters
    const [categoryFilter, setCategoryFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');

    const componentRef = useRef();

    useEffect(() => {
        fetchReports();
        fetchRates();
    }, [categoryFilter, brandFilter]);

    const fetchRates = async () => {
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await res.json();
            const resEur = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
            const dataEur = await resEur.json();
            setRates({
                USD: data.rates.TRY,
                EUR: dataEur.rates.TRY
            });
        } catch (error) {
            console.error("Kurlar alınamadı:", error);
        }
    };

    const fetchReports = async () => {
        try {
            setLoading(true);
            const [dataRes, statsRes] = await Promise.all([
                api.get('/reports/inventory', { params: { categoryId: categoryFilter, brand: brandFilter } }),
                api.get('/reports/dashboard') // Global stats
            ]);
            setReportData(dataRes.data);
            setStats(statsRes.data.stats || {});
            setTopSold(statsRes.data.topSold || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rapor");
        XLSX.writeFile(workbook, "StokRaporu.xlsx");
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    const calculateTotalTL = () => {
        return reportData.reduce((acc, row) => {
            const value = row.ToplamEnvanterDegeri || 0;
            const currency = row.ParaBirimi || 'TL';
            const rate = currency === 'USD' ? rates.USD : (currency === 'EUR' ? rates.EUR : 1);
            return acc + (value * rate);
        }, 0);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 print:p-0 print:m-0 print:max-w-none">
            {/* Header (Hidden in Print) */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <TrendingUp className="text-indigo-600" /> Stok Raporları & Analiz
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Gerçek zamanlı envanter durumu ve değerlemeler</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleDownloadExcel} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition font-medium">
                        <Download size={18} /> Excel İndir
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium">
                        <Printer size={18} /> Yazdır
                    </button>
                </div>
            </div>

            {/* Widgets Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 font-medium text-sm">Toplam Envanter Değeri (TL)</p>
                            <h3 className="text-2xl font-bold text-indigo-600 mt-2">
                                ₺{calculateTotalTL().toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </h3>
                            <p className="text-[10px] text-gray-400 mt-1">USD: {rates.USD.toFixed(2)} | EUR: {rates.EUR.toFixed(2)} kurlarıyla hesaplandı</p>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 font-medium text-sm">Kritik Stok Uyarı</p>
                            <h3 className="text-2xl font-bold text-red-600 mt-2">
                                {stats.CriticalCount} Ürün
                            </h3>
                            <p className="text-xs text-red-400 mt-1">Minimum seviyenin altında</p>
                        </div>
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 font-medium text-sm">Toplam Ürün Çeşidi</p>
                            <h3 className="text-2xl font-bold text-blue-600 mt-2">
                                {reportData.length} Adet
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Grid size={24} />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Charts Section (Hidden in Print usually, or visible if requested. Keeping visible) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:break-inside-avoid">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-96">
                    <h3 className="font-bold text-gray-700 mb-4">En Çok Çıkan Ürünler (Top 5)</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topSold} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="StokAdi" type="category" width={120} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="Value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                    {topSold.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-96">
                    <h3 className="font-bold text-gray-700 mb-4">Stok Dağılımı (Kategori Bazlı - Örnek)</h3>
                    <div className="flex-1 min-h-0 flex items-center justify-center text-gray-400">
                        <PieChart width={200} height={200}>
                            <Pie data={[{ name: 'A', value: 400 }, { name: 'B', value: 300 }]} cx="50%" cy="50%" outerRadius={60} fill="#8884d8" dataKey="value" label />
                        </PieChart>
                        <span className="ml-4">Detaylı Dağılım Grafiği (Veri bekleniyor)</span>
                    </div>
                </div>
            </div>

            {/* Filter Panel (Hidden in Print) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4 print:hidden">
                <div className="flex items-center gap-2 text-gray-500 font-medium">
                    <Filter size={18} /> Filtrele:
                </div>
                <input
                    type="text"
                    placeholder="Marka Ara..."
                    className="p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                />
                {/* Category Dropdown could be here */}
            </div>

            {/* Report Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-none">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase font-semibold border-b border-gray-100 print:bg-gray-200">
                        <tr>
                            <th className="p-4">Stok Kodu</th>
                            <th className="p-4">Stok Adı</th>
                            <th className="p-4">Marka</th>
                            <th className="p-4 text-center">Giriş</th>
                            <th className="p-4 text-center">Çıkış</th>
                            <th className="p-4 text-center">Mevcut</th>
                            <th className="p-4 text-right">Ort. Fiyat</th>
                            <th className="p-4 text-right">Top. Değer</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {reportData.map((row, i) => (
                            <tr key={i} className={`hover:bg-gray-50 print:hover:bg-transparent ${row.MevcutStok <= row.MinStokSeviyesi ? 'bg-red-50/50 print:bg-transparent' : ''}`}>
                                <td className="p-4 font-mono text-xs text-gray-500">{row.StokKodu}</td>
                                <td className="p-4 font-medium text-gray-800">
                                    {row.StokAdi}
                                    {row.MevcutStok <= row.MinStokSeviyesi && <span className="ml-2 text-xs text-red-500 font-bold print:hidden">(KRİTİK)</span>}
                                </td>
                                <td className="p-4 text-gray-600">{row.Marka || '-'}</td>
                                <td className="p-4 text-center text-green-600 bg-green-50/30 font-medium">+{row.ToplamGirisMiktar}</td>
                                <td className="p-4 text-center text-red-600 bg-red-50/30 font-medium">-{row.ToplamCikisMiktar}</td>
                                <td className="p-4 text-center font-bold text-gray-800">{row.MevcutStok} {row.AnaBirim}</td>
                                <td className="p-4 text-right text-gray-600">
                                    {row.ParaBirimi === 'USD' ? '$' : (row.ParaBirimi === 'EUR' ? '€' : '₺')}
                                    {row.OrtalamaAlisFiyati?.toFixed(2)}
                                </td>
                                <td className="p-4 text-right font-bold text-indigo-600">
                                    <div className="flex flex-col">
                                        <span>
                                            {row.ParaBirimi === 'USD' ? '$' : (row.ParaBirimi === 'EUR' ? '€' : '₺')}
                                            {row.ToplamEnvanterDegeri?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </span>
                                        {row.ParaBirimi !== 'TL' && (
                                            <span className="text-[10px] text-gray-400">
                                                ₺{(row.ToplamEnvanterDegeri * (row.ParaBirimi === 'USD' ? rates.USD : rates.EUR)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Print Styles Injection */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .max-w-7xl, .max-w-7xl * {
                        visibility: visible;
                    }
                    .max-w-7xl {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default StockReports;
