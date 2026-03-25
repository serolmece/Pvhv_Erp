import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
    Search, Plus, FileSpreadsheet, Barcode, Filter,
    Edit, Trash2, Activity, AlertCircle, Save, X, Wand2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../api/axios';
import DecimalInput from '../components/DecimalInput';

const Products = () => {
    const { user } = useAuth();
    const { refreshTrigger } = useOutletContext();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [currentProductId, setCurrentProductId] = useState(null);
    const [formData, setFormData] = useState({
        stokKodu: '', stokAdi: '', barkod: '', kategoriId: '', marka: '', model: '',
        anaBirim: 'Adet', altBirim: '', alisFiyati: 0, satisFiyati: 0, kdvOrani: 20,
        paraBirimi: 'TL', minStok: 0, maxStok: 0
    });
    const [categories, setCategories] = useState([]);

    // Fetch Data
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/stock-cards'); // Ensure backend route is /api/stock-cards
            setProducts(res.data);

            // Fetch categories
            try {
                const catRes = await api.get('/stock-cards/categories');
                setCategories(catRes.data);
            } catch (err) {
                console.error("Kategoriler yüklenemedi", err);
                // Fallback mock check if needed, but better to log error
                setCategories([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [refreshTrigger]);

    // Handlers
    const handleSearch = (e) => setSearchTerm(e.target.value);

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(products);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Stok Kartları");
        XLSX.writeFile(workbook, "StokListesi.xlsx");
    };

    const handleGenerateBarcode = () => {
        // Logic to generate unique barcode (backend call or frontend logic)
        const unique = Math.floor(Math.random() * 1000000000000);
        setFormData({ ...formData, barkod: unique.toString() });
    };

    const handleOpenModal = (product = null) => {
        if (product) {
            setCurrentProductId(product.StokID);
            setFormData({
                stokKodu: product.StokKodu || '',
                stokAdi: product.StokAdi || '',
                barkod: product.Barkod || '',
                kategoriId: product.KategoriID || '',
                marka: product.Marka || '',
                model: product.Model || '',
                anaBirim: product.AnaBirim || 'Adet',
                altBirim: product.AltBirim || '',
                alisFiyati: product.AlisFiyati || 0,
                satisFiyati: product.SatisFiyati || 0,
                kdvOrani: product.KDVOrani || 20,
                paraBirimi: product.ParaBirimi || 'TL',
                minStok: product.MinStokSeviyesi || 0,
                maxStok: product.MaxStokSeviyesi || 0
            });
        } else {
            setCurrentProductId(null);
            setFormData({
                stokKodu: '', stokAdi: '', barkod: '', kategoriId: '', marka: '', model: '',
                anaBirim: 'Adet', altBirim: '', alisFiyati: 0, satisFiyati: 0, kdvOrani: 20,
                paraBirimi: 'TL', minStok: 0, maxStok: 0
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentProductId) {
                await api.put(`/stock-cards/${currentProductId}`, formData);
            } else {
                await api.post('/stock-cards', formData);
            }
            setShowModal(false);
            fetchProducts();
            setCurrentProductId(null);
        } catch (err) {
            alert('Hata: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bu stok kartını silmek istediğinize emin misiniz?')) {
            try {
                await api.delete(`/stock-cards/${id}`);
                fetchProducts();
            } catch (err) {
                alert('Silinemedi.');
            }
        }
    };

    // Filtered Products
    const filteredProducts = products.filter(p =>
        p.StokAdi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.StokKodu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.Barkod?.includes(searchTerm)
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Stok Kartları</h1>
                    <p className="text-gray-500 text-sm">Toplam {filteredProducts.length} kayıt listeleniyor</p>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition font-medium">
                        <FileSpreadsheet size={18} /> Excel
                    </button>
                    <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium shadow-lg shadow-indigo-200">
                        <Plus size={18} /> Yeni Stok veya Ürün Ekle
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Stok Adı veya Kodu ile ara..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
                <button className="p-2 bg-gray-50 text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-100">
                    <Filter size={20} />
                </button>
            </div>

            {/* Grid List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4">Stok Kodu</th>
                                <th className="p-4">Stok Adı</th>
                                {/* <th className="p-4">Barkod</th> */}
                                <th className="p-4">Marka/Model</th>
                                <th className="p-4">Alış Fiyatı</th>
                                <th className="p-4 text-center">Stok</th>
                                <th className="p-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-500">Yükleniyor...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                            ) : filteredProducts.map((product) => {
                                const isCritical = (product.MevcutStok || 0) <= (product.MinStokSeviyesi || 0);
                                return (
                                    <tr key={product.StokID} className={`hover:bg-gray-50 transition ${isCritical ? 'bg-red-50/50' : ''}`}>
                                        <td className="p-4 font-medium text-gray-800">{product.StokKodu}</td>
                                        <td className="p-4 text-gray-700">
                                            <div>{product.StokAdi}</div>
                                            <div className="text-xs text-gray-400">{product.KategoriAdi}</div>
                                        </td>
                                        {/* <td className="p-4 text-gray-500 font-mono text-xs">{product.Barkod}</td> */}
                                        <td className="p-4 text-gray-600 text-sm">{product.Marka} {product.Model}</td>
                                        <td className="p-4 font-semibold text-gray-800">
                                            {product.AlisFiyati} {product.ParaBirimi}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isCritical ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                {product.MevcutStok || 0} {product.AnaBirim}
                                            </span>
                                        </td>
                                        <td className="p-4 flex items-center justify-end gap-2">
                                            <button onClick={() => window.location.href = `/stock-movements?stokId=${product.StokID}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Hareket İzle"><Activity size={18} /></button>
                                            <button onClick={() => handleOpenModal(product)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition" title="Düzenle"><Edit size={18} /></button>
                                            <button onClick={() => handleDelete(product.StokID)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="Sil"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-800">{currentProductId ? 'Stok Kartı Düzenle' : 'Yeni Stok Kartı'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* General */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-indigo-600 border-b border-indigo-100 pb-2 mb-4">Genel Bilgiler</h3>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700">Stok Kodu</label>
                                        <input type="text" required className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                            value={formData.stokKodu} onChange={e => setFormData({ ...formData, stokKodu: e.target.value })} />
                                    </div>
                                    <button type="button" onClick={() => {
                                        const timestamp = Date.now().toString().slice(-6);
                                        const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
                                        setFormData({ ...formData, stokKodu: `STK-${timestamp}${randomStr}` });
                                    }} className="mb-[2px] p-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300" title="Otomatik Stok Kodu Üret">
                                        <Wand2 size={20} className="text-gray-600" />
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Stok Adı</label>
                                    <input type="text" required className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                        value={formData.stokAdi} onChange={e => setFormData({ ...formData, stokAdi: e.target.value })} />
                                </div>
                                {/* Barkod alanı şimdilik gizlendi
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700">Barkod</label>
                                        <input type="text" className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                            value={formData.barkod} onChange={e => setFormData({ ...formData, barkod: e.target.value })} />
                                    </div>
                                    <button type="button" onClick={handleGenerateBarcode} className="mb-[2px] p-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300" title="Barkod Üret">
                                        <Barcode size={20} className="text-gray-600" />
                                    </button>
                                </div>
                                */}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Kategori</label>
                                    <select
                                        required
                                        className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                        value={formData.kategoriId}
                                        onChange={e => setFormData({ ...formData, kategoriId: e.target.value })}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {categories.map(cat => (
                                            <option key={cat.KategoriID} value={cat.KategoriID}>{cat.KategoriAdi}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Marka</label>
                                        <input type="text" className="mt-1 w-full border border-gray-300 rounded-lg p-2"
                                            value={formData.marka} onChange={e => setFormData({ ...formData, marka: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Model</label>
                                        <input type="text" className="mt-1 w-full border border-gray-300 rounded-lg p-2"
                                            value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Ana Birim</label>
                                        <select className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                            value={formData.anaBirim} onChange={e => setFormData({ ...formData, anaBirim: e.target.value })}>
                                            <option value="Adet">Adet</option>
                                            <option value="Kg">Kg</option>
                                            <option value="Gr">Gr</option>
                                            <option value="Litre">Litre</option>
                                            <option value="M">Metre</option>
                                            <option value="Koli">Koli</option>
                                            <option value="Paket">Paket</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Alt Birim (Opsiyonel)</label>
                                        <input type="text" placeholder="Örn: Kutu, Palet" className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                            value={formData.altBirim} onChange={e => setFormData({ ...formData, altBirim: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Financials & Limits */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-indigo-600 border-b border-indigo-100 pb-2 mb-4">Maliyet ve Stok</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Alış Fiyatı</label>
                                        <DecimalInput className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                            value={formData.alisFiyati} onChange={e => setFormData({ ...formData, alisFiyati: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Satış Fiyatı</label>
                                        <DecimalInput required className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                            value={formData.satisFiyati} onChange={e => setFormData({ ...formData, satisFiyati: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">KDV (%)</label>
                                        <DecimalInput className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                            value={formData.kdvOrani} onChange={e => setFormData({ ...formData, kdvOrani: e.target.value })} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Para Birimi</label>
                                        <select className="mt-1 w-full border border-gray-300 rounded-lg p-2"
                                            value={formData.paraBirimi} onChange={e => setFormData({ ...formData, paraBirimi: e.target.value })}>
                                            <option value="TL">TL</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-red-800">Min Stok</label>
                                            <DecimalInput className="mt-1 w-full border border-red-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-red-400 outline-none"
                                                value={formData.minStok} onChange={e => setFormData({ ...formData, minStok: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-red-800">Max Stok</label>
                                            <DecimalInput className="mt-1 w-full border border-red-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-red-400 outline-none"
                                                value={formData.maxStok} onChange={e => setFormData({ ...formData, maxStok: e.target.value })} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle size={12} /> Min seviye altına düştüğünde uyarı verilir.</p>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition font-medium">İptal</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium shadow-lg flex items-center gap-2">
                                    <Save size={18} /> {currentProductId ? 'Güncelle' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Products;
