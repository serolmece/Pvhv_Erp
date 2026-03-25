import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Plus, Edit, Trash2, Search, Filter, History, X, Save
} from 'lucide-react';

const Suppliers = ({ isEmbedded = false }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [currentSupplier, setCurrentSupplier] = useState(null);
    const [supplierHistory, setSupplierHistory] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        TedarikciAdi: '',
        VergiNo: '',
        VergiDairesi: '',
        Eposta: '',
        Telefon: '',
        Adres: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const response = await api.get('/suppliers');
            setSuppliers(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.TedarikciAdi) newErrors.TedarikciAdi = 'Tedarikçi Adı zorunludur.';
        // if (formData.VergiNo && (formData.VergiNo.length < 10 || formData.VergiNo.length > 11)) {
        //     newErrors.VergiNo = 'Vergi No 10 veya 11 haneli olmalıdır.';
        // }
        // Basic email validation
        if (formData.Eposta && !/\S+@\S+\.\S+/.test(formData.Eposta)) {
            newErrors.Eposta = 'Geçerli bir e-posta adresi giriniz.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            if (currentSupplier) {
                await api.put(`/suppliers/${currentSupplier.TedarikciID}`, formData);
            } else {
                await api.post('/suppliers', formData);
            }
            fetchSuppliers();
            closeModal();
        } catch (error) {
            console.error('Error saving supplier:', error);
            alert(error.response?.data?.message || 'Bir hata oluştu.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/suppliers/${id}`);
            fetchSuppliers();
        } catch (error) {
            console.error('Error deleting supplier:', error);
            alert(error.response?.data?.message || 'Silme işlemi başarısız.');
        }
    };

    const openModal = (supplier = null) => {
        if (supplier) {
            setCurrentSupplier(supplier);
            setFormData({
                TedarikciAdi: supplier.TedarikciAdi,
                VergiNo: supplier.VergiNo || '',
                VergiDairesi: supplier.VergiDairesi || '',
                Eposta: supplier.Eposta || '',
                Telefon: supplier.Telefon || '',
                Adres: supplier.Adres || ''
            });
        } else {
            setCurrentSupplier(null);
            setFormData({
                TedarikciAdi: '',
                VergiNo: '',
                VergiDairesi: '',
                Eposta: '',
                Telefon: '',
                Adres: ''
            });
        }
        setErrors({});
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentSupplier(null);
    };

    const showHistory = async (supplier) => {
        setCurrentSupplier(supplier);
        try {
            const response = await api.get(`/suppliers/${supplier.TedarikciID}/history`);
            setSupplierHistory(response.data);
            setIsHistoryModalOpen(true);
        } catch (error) {
            console.error('Error fetching history:', error);
            alert('Geçmiş bilgisi alınamadı.');
        }
    };

    const closeHistoryModal = () => {
        setIsHistoryModalOpen(false);
        setSupplierHistory([]);
        setCurrentSupplier(null);
    };

    // Filter functionality
    const filteredSuppliers = suppliers.filter(s => {
        const term = searchTerm.toLowerCase();
        const cleanTerm = term.replace(/\s+/g, '');

        return (
            s.TedarikciAdi.toLowerCase().includes(term) ||
            (s.VergiNo && s.VergiNo.replace(/\s+/g, '').includes(cleanTerm)) ||
            (s.Eposta && s.Eposta.toLowerCase().includes(term))
        );
    });

    return (
        <div className={isEmbedded ? "" : "p-6 bg-gray-50 min-h-screen"}>
            <div className={`flex justify-between items-center mb-8 ${isEmbedded ? "mt-4" : ""}`}>
                {!isEmbedded && (
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Tedarikçi Tanımları</h1>
                        <p className="text-gray-500 mt-1">Hammadde alımları için tedarikçi yönetimi</p>
                    </div>
                )}
                {isEmbedded && <div />}
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition shadow-sm"
                >
                    <Plus size={20} />
                    Yeni Tedarikçi
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Tedarikçi adı, vergi no veya e-posta ile ara..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition">
                    <Filter size={18} />
                    Filtrele
                </button>
            </div>

            {/* Suppliers Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tedarikçi Adı</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vergi Bilgileri</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">İletişim</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bakiye</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Yükleniyor...</td>
                                </tr>
                            ) : filteredSuppliers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
                                </tr>
                            ) : (
                                filteredSuppliers.map((supplier) => (
                                    <tr key={supplier.TedarikciID} className="hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{supplier.TedarikciAdi}</div>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{supplier.Adres}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{supplier.VergiNo || '-'}</div>
                                            <div className="text-sm text-gray-500">{supplier.VergiDairesi}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{supplier.Eposta || '-'}</div>
                                            <div className="text-sm text-gray-500">{supplier.Telefon || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(supplier.CariBakiye || 0) > 0
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-green-100 text-green-800'
                                                }`}>
                                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(supplier.CariBakiye || 0)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => showHistory(supplier)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                    title="Hammadde Geçmişi"
                                                >
                                                    <History size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openModal(supplier)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Düzenle"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(supplier.TedarikciID)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Main Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {currentSupplier ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi Ekle'}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700">Tedarikçi Adı *</label>
                                <input
                                    type="text"
                                    name="TedarikciAdi"
                                    value={formData.TedarikciAdi}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition ${errors.TedarikciAdi ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Şirket veya Şahıs Adı"
                                />
                                {errors.TedarikciAdi && <p className="text-xs text-red-500 mt-1">{errors.TedarikciAdi}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Vergi No</label>
                                <input
                                    type="text"
                                    name="VergiNo"
                                    value={formData.VergiNo}
                                    onChange={handleInputChange}
                                    maxLength={11}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition ${errors.VergiNo ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Vergi No (Opsiyonel)"
                                />
                                {errors.VergiNo && <p className="text-xs text-red-500 mt-1">{errors.VergiNo}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Vergi Dairesi</label>
                                <input
                                    type="text"
                                    name="VergiDairesi"
                                    value={formData.VergiDairesi}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                                    placeholder="Vergi Dairesi Adı"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">E-posta</label>
                                <input
                                    type="email"
                                    name="Eposta"
                                    value={formData.Eposta}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition ${errors.Eposta ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="ornek@sirket.com"
                                />
                                {errors.Eposta && <p className="text-xs text-red-500 mt-1">{errors.Eposta}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Telefon</label>
                                <input
                                    type="text"
                                    name="Telefon"
                                    value={formData.Telefon}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                                    placeholder="0212 123 45 67"
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700">Adres</label>
                                <textarea
                                    name="Adres"
                                    value={formData.Adres}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition resize-none"
                                    placeholder="Açık adres bilgisi..."
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm font-medium flex items-center gap-2"
                                >
                                    <Save size={18} />
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Stok Hareket Geçmişi
                                </h3>
                                <p className="text-sm text-gray-500">{currentSupplier?.TedarikciAdi}</p>
                            </div>
                            <button
                                onClick={closeHistoryModal}
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-0 overflow-auto flex-1">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tarih</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ürün</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">İşlem</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Miktar</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Tutar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {supplierHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                                Bu tedarikçi için kayıtlı stok hareketi bulunmuyor.
                                            </td>
                                        </tr>
                                    ) : (
                                        supplierHistory.map((item) => (
                                            <tr key={item.HareketID} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-3 text-sm text-gray-900">
                                                    {new Date(item.Tarih).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-900">
                                                    <div className="font-medium">{item.UrunAdi || 'Bilinmeyen Ürün'}</div>
                                                    <div className="text-xs text-gray-500">{item.StokKodu}</div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.HareketTipi === 'Giris' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {item.HareketTipi === 'Giris' ? 'Stok Girişi' : 'Stok Çıkışı'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-900 text-right font-mono">
                                                    {item.Miktar}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-900 text-right font-mono">
                                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.ToplamTutar || 0)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                            <button
                                onClick={closeHistoryModal}
                                className="px-5 py-2 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition text-sm font-medium shadow-sm"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
