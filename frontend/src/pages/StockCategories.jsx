import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Edit, Trash2, Save, X, Search, FileText
} from 'lucide-react';
import api from '../api/axios';

const StockCategories = () => {
    const { user } = useAuth();
    const { refreshTrigger } = useOutletContext();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        kategoriAdi: '',
        aciklama: '',
        id: null
    });

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await api.get('/stock-cards/categories');
            setCategories(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [refreshTrigger]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode) {
                await api.put(`/stock-cards/categories/${formData.id}`, {
                    kategoriAdi: formData.kategoriAdi,
                    aciklama: formData.aciklama
                });
            } else {
                await api.post('/stock-cards/categories', {
                    kategoriAdi: formData.kategoriAdi,
                    aciklama: formData.aciklama
                });
            }
            setShowModal(false);
            fetchCategories();
            resetForm();
        } catch (err) {
            alert('Hata: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) {
            try {
                await api.delete(`/stock-cards/categories/${id}`);
                fetchCategories();
            } catch (err) {
                alert('Hata: ' + (err.response?.data?.message || err.message));
            }
        }
    };

    const handleEdit = (category) => {
        setFormData({
            kategoriAdi: category.KategoriAdi,
            aciklama: category.Aciklama || '',
            id: category.KategoriID
        });
        setIsEditMode(true);
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({ kategoriAdi: '', aciklama: '', id: null });
        setIsEditMode(false);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };

    const filteredCategories = categories.filter(c =>
        c.KategoriAdi?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Stok Kategorileri</h1>
                    <p className="text-gray-500 text-sm">Toplam {filteredCategories.length} kategori listeleniyor</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium shadow-lg shadow-indigo-200"
                    >
                        <Plus size={18} /> Yeni Kategori Ekle
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Kategori Adı ile ara..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4">Kategori Adı</th>
                                <th className="p-4">Açıklama</th>
                                <th className="p-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="3" className="p-8 text-center text-gray-500">Yükleniyor...</td></tr>
                            ) : filteredCategories.length === 0 ? (
                                <tr><td colSpan="3" className="p-8 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                            ) : filteredCategories.map((category) => (
                                <tr key={category.KategoriID} className="hover:bg-gray-50 transition">
                                    <td className="p-4 font-medium text-gray-800">{category.KategoriAdi}</td>
                                    <td className="p-4 text-gray-600">{category.Aciklama}</td>
                                    <td className="p-4 flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                            title="Düzenle"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category.KategoriID)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                            title="Sil"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
                    >
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
                            <h2 className="text-xl font-bold text-gray-800">
                                {isEditMode ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Kategori Adı</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                    value={formData.kategoriAdi}
                                    onChange={e => setFormData({ ...formData, kategoriAdi: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                                <textarea
                                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                    rows="3"
                                    value={formData.aciklama}
                                    onChange={e => setFormData({ ...formData, aciklama: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition font-medium"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium shadow-lg flex items-center gap-2"
                                >
                                    <Save size={18} /> Kaydet
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default StockCategories;
