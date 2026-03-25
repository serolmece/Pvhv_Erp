import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Plus, Edit, Trash2, Search, Filter, X, Save, Briefcase
} from 'lucide-react';

const OtherAccounts = ({ isEmbedded = false }) => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAccount, setCurrentAccount] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        Unvan: '',
        VKN: '',
        VergiDairesi: '',
        Adres: '',
        Iletisim: '',
        Eposta: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const response = await api.get('/other-accounts');
            setAccounts(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching other accounts:', error);
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.Unvan) newErrors.Unvan = 'Ünvan/İsim zorunludur.';
        // Basic email validation
        if (formData.Eposta && !/\\S+@\\S+\\.\\S+/.test(formData.Eposta)) {
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
            if (currentAccount) {
                await api.put(`/other-accounts/${currentAccount.CariID}`, {
                    unvan: formData.Unvan,
                    vkn: formData.VKN,
                    vergiDairesi: formData.VergiDairesi,
                    adres: formData.Adres,
                    iletisim: formData.Iletisim,
                    eposta: formData.Eposta
                });
            } else {
                await api.post(`/other-accounts`, {
                    unvan: formData.Unvan,
                    vkn: formData.VKN,
                    vergiDairesi: formData.VergiDairesi,
                    adres: formData.Adres,
                    iletisim: formData.Iletisim,
                    eposta: formData.Eposta
                });
            }
            fetchAccounts();
            closeModal();
        } catch (error) {
            console.error('Error saving other account:', error);
            alert(error.response?.data?.message || 'Bir hata oluştu.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu cari hesabı silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/other-accounts/${id}`);
            fetchAccounts();
        } catch (error) {
            console.error('Error deleting other account:', error);
            alert(error.response?.data?.message || 'Silme işlemi başarısız.');
        }
    };

    const openModal = (account = null) => {
        if (account) {
            setCurrentAccount(account);
            setFormData({
                Unvan: account.Unvan,
                VKN: account.VergiNo || '',
                VergiDairesi: account.VergiDairesi || '',
                Adres: account.Adres || '',
                Iletisim: account.Iletisim || '',
                Eposta: account.Eposta || ''
            });
        } else {
            setCurrentAccount(null);
            setFormData({
                Unvan: '',
                VKN: '',
                VergiDairesi: '',
                Adres: '',
                Iletisim: '',
                Eposta: ''
            });
        }
        setErrors({});
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentAccount(null);
    };

    // Filter functionality
    const filteredAccounts = accounts.filter(c => {
        const term = searchTerm.toLowerCase();
        const cleanTerm = term.replace(/\\s+/g, '');

        return (
            (c.Unvan && c.Unvan.toLowerCase().includes(term)) ||
            (c.VergiNo && c.VergiNo.replace(/\\s+/g, '').includes(cleanTerm))
        );
    });

    return (
        <div className={isEmbedded ? "" : "p-6 bg-gray-50 min-h-screen"}>
            <div className={`flex justify-between items-center mb-8 ${isEmbedded ? "mt-4" : ""}`}>
                {!isEmbedded && (
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Diğer Cariler</h1>
                        <p className="text-gray-500 mt-1">Müşteri veya Tedarikçi olmayan diğer hesaplar (Örn: Banka, Personel, Ortaklar vb.)</p>
                    </div>
                )}
                {isEmbedded && <div />}
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition shadow-sm font-medium"
                >
                    <Plus size={20} />
                    Yeni Cari
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Ünvan/İsim veya Vergi/TC No ile ara..."
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

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unvan / Adres</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">VKN / TC No</th>
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
                            ) : filteredAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
                                </tr>
                            ) : (
                                filteredAccounts.map((acc) => (
                                    <tr key={acc.CariID} className="hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{acc.Unvan}</div>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{acc.Adres || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{acc.VergiNo || '-'}</div>
                                            <div className="text-sm text-gray-500">{acc.VergiDairesi}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{acc.Eposta || '-'}</div>
                                            <div className="text-sm text-gray-500">{acc.Iletisim || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(acc.Bakiye || 0) < 0
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-green-100 text-green-800'
                                                }`}>
                                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(acc.Bakiye || 0)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openModal(acc)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Düzenle"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(acc.CariID)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={16} />
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Briefcase size={20} className="text-blue-600" />
                                {currentAccount ? 'Cari Düzenle' : 'Yeni Cari Ekle'}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Ünvan / İsim <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="Unvan"
                                    value={formData.Unvan}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition ${errors.Unvan ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Kurum veya Kişi Adı"
                                />
                                {errors.Unvan && <p className="text-xs text-red-500 mt-1">{errors.Unvan}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Vergi / TC No</label>
                                    <input
                                        type="text"
                                        name="VKN"
                                        value={formData.VKN}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Vergi Dairesi</label>
                                    <input
                                        type="text"
                                        name="VergiDairesi"
                                        value={formData.VergiDairesi}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Telefon</label>
                                    <input
                                        type="text"
                                        name="Iletisim"
                                        value={formData.Iletisim}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">E-posta</label>
                                    <input
                                        type="text"
                                        name="Eposta"
                                        value={formData.Eposta}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition ${errors.Eposta ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                    {errors.Eposta && <p className="text-xs text-red-500 mt-1">{errors.Eposta}</p>}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Adres</label>
                                <textarea
                                    name="Adres"
                                    value={formData.Adres}
                                    onChange={handleInputChange}
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm font-medium flex items-center gap-2 shadow-sm"
                                >
                                    <Save size={18} />
                                    {currentAccount ? 'Güncelle' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OtherAccounts;
