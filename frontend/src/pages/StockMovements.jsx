import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowUpCircle, ArrowDownCircle, Search, Save,
    FileText, Calendar, Filter, Archive
} from 'lucide-react';
import api from '../api/axios';
import DecimalInput from '../components/DecimalInput';

const StockMovements = () => {
    const { refreshTrigger } = useOutletContext();
    const [movements, setMovements] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        stokId: '', cariId: '', hareketTipi: 'Giris',
        miktar: 1, birimFiyat: 0, kdvOrani: 18, aciklama: ''
    });

    const [stats, setStats] = useState({ ToplamGiris: 0, ToplamCikis: 0 });

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [movRes, stockRes, accRes, supRes, statRes] = await Promise.all([
                api.get('/stock-movements'),
                api.get('/stock-cards'),
                api.get('/accounts'),
                api.get('/suppliers'),
                api.get('/stock-movements/daily-stats')
            ]);
            setMovements(movRes.data);
            setStocks(stockRes.data);
            setAccounts(accRes.data);
            setSuppliers(supRes.data);
            setStats(statRes.data || { ToplamGiris: 0, ToplamCikis: 0 });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [refreshTrigger]);

    const handleStockSelect = (id) => {
        const stock = stocks.find(s => s.StokID.toString() === id);
        if (stock) {
            setFormData({
                ...formData,
                stokId: id,
                // If 'Giris', auto-fill price from last purchase price (AlisFiyati)
                birimFiyat: formData.hareketTipi === 'Giris' ? stock.AlisFiyati : stock.SatisFiyati
            });
        } else {
            setFormData({ ...formData, stokId: id });
        }
    };

    const handleTypeChange = (type) => {
        setFormData({
            ...formData,
            hareketTipi: type,
            cariId: '', // Reset Cari Selection on type change
        });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/stock-movements', formData);
            alert('Hareket kaydedildi.');
            fetchAll(); // Refresh list and stats
            // Reset form partly
            setFormData({ ...formData, miktar: 1, aciklama: '' });
        } catch (err) {
            alert('Hata: ' + (err.response?.data?.message || err.message));
        }
    };

    const filteredMovements = movements.filter(m =>
        m.StokAdi?.toLowerCase().includes(filter.toLowerCase()) ||
        m.BelgeNo?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 font-medium">Bugünkü Toplam Giriş</p>
                        <h2 className="text-3xl font-bold text-green-600 mt-1">{stats.ToplamGiris || 0} Adet</h2>
                    </div>
                    <div className="p-4 bg-green-50 text-green-600 rounded-xl">
                        <ArrowDownCircle size={32} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 font-medium">Bugünkü Toplam Çıkış</p>
                        <h2 className="text-3xl font-bold text-red-600 mt-1">{stats.ToplamCikis || 0} Adet</h2>
                    </div>
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl">
                        <ArrowUpCircle size={32} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24"
                    >
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <FileText className="text-indigo-600" /> Yeni Hareket Fişi
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Type Switch */}
                            <div className="bg-gray-100 p-1 rounded-xl flex mb-6">
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('Giris')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${formData.hareketTipi === 'Giris' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Giriş (Alım)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('Cikis')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${formData.hareketTipi === 'Cikis' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Çıkış (Satış)
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Stok Kartı</label>
                                <select
                                    required
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.stokId}
                                    onChange={(e) => handleStockSelect(e.target.value)}
                                >
                                    <option value="">Seçiniz...</option>
                                    {stocks.map(s => (
                                        <option key={s.StokID} value={s.StokID}>
                                            {s.StokKodu} - {s.StokAdi} (Mevcut: {s.MevcutStok})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {formData.hareketTipi === 'Giris' ? 'Tedarikçi' : 'Cari Hesap / Müşteri'} (Opsiyonel)
                                </label>
                                <select
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.cariId}
                                    onChange={(e) => setFormData({ ...formData, cariId: e.target.value })}
                                >
                                    <option value="">{formData.hareketTipi === 'Giris' ? 'Tedarikçi Seçiniz...' : 'Hesap Seçiniz...'}</option>
                                    {formData.hareketTipi === 'Giris' ? (
                                        suppliers.map(s => (
                                            <option key={s.TedarikciID} value={s.TedarikciID}>
                                                {s.TedarikciAdi}
                                            </option>
                                        ))
                                    ) : (
                                        accounts.map(a => (
                                            <option key={a.AccountID} value={a.AccountID}>
                                                {a.AccountName}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Miktar</label>
                                    <DecimalInput
                                        required
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.miktar}
                                        onChange={(e) => setFormData({ ...formData, miktar: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Birim Fiyat</label>
                                    <DecimalInput
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.birimFiyat}
                                        onChange={(e) => setFormData({ ...formData, birimFiyat: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                                <textarea
                                    rows="2"
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.aciklama}
                                    onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                                />
                            </div>

                            <button type="submit" className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 ${formData.hareketTipi === 'Giris' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}>
                                <Save size={20} />
                                {formData.hareketTipi === 'Giris' ? 'Girişi Kaydet' : 'Çıkışı Kaydet'}
                            </button>
                        </form>
                    </motion.div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <Search className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Hareketlerde ara..."
                            className="flex-1 bg-transparent outline-none text-gray-700"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-100">
                                <tr>
                                    <th className="p-4">Belge No</th>
                                    <th className="p-4">Tarih</th>
                                    <th className="p-4">Stok</th>
                                    <th className="p-4">Cari</th>
                                    <th className="p-4 text-center">Tip</th>
                                    <th className="p-4 text-right">Miktar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loading ? (
                                    <tr><td colSpan="6" className="p-6 text-center text-gray-500">Yükleniyor...</td></tr>
                                ) : filteredMovements.length === 0 ? (
                                    <tr><td colSpan="6" className="p-6 text-center text-gray-500">Kayıt Yok</td></tr>
                                ) : filteredMovements.map(m => (
                                    <tr key={m.HareketID} className="hover:bg-gray-50 transition">
                                        <td className="p-4 font-mono text-xs text-indigo-600">{m.BelgeNo}</td>
                                        <td className="p-4 text-gray-500">{new Date(m.Tarih).toLocaleDateString('tr-TR')}</td>
                                        <td className="p-4 font-medium text-gray-800">{m.StokAdi}</td>
                                        <td className="p-4 text-gray-600">{m.CariAdi || '-'}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${m.HareketTipi === 'Giris' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {m.HareketTipi.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-right font-bold ${m.HareketTipi === 'Giris' ? 'text-green-600' : 'text-red-600'}`}>
                                            {m.HareketTipi === 'Giris' ? '+' : '-'}{m.Miktar}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockMovements;
