import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../api/axios';
import {
    Plus, Edit, Trash2, Search, Filter, ShoppingBag, FileText, X, Save, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Customers = ({ isEmbedded = false }) => {
    const navigate = useNavigate();
    const { refreshTrigger } = useOutletContext();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        Unvan: '',
        VKN: '',
        Adres: '',
        Iletisim: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchCustomers();
    }, [refreshTrigger]);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setCustomers(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching customers:', error);
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.Unvan) newErrors.Unvan = 'Müşteri Unvanı zorunludur.';
        if (formData.VKN && (formData.VKN.length < 10 || formData.VKN.length > 11)) {
            newErrors.VKN = 'Vergi/TC No 10 veya 11 haneli olmalıdır.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Sadece rakam girişine izin ver (VKN için)
        if (name === 'VKN') {
            const numericValue = value.replace(/\\D/g, '');
            setFormData(prev => ({ ...prev, [name]: numericValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const payload = {
                unvan: formData.Unvan,
                vkn: formData.VKN,
                adres: formData.Adres,
                iletisim: formData.Iletisim
            };
            if (currentCustomer) {
                await api.put(`/customers/${currentCustomer.MusteriID}`, payload);
            } else {
                await api.post('/customers', payload);
            }
            fetchCustomers();
            closeModal();
        } catch (error) {
            console.error('Error saving customer:', error);
            alert(error.response?.data?.message || 'Bir hata oluştu.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu müşteriyi silmek istediğinize emin misiniz? (Aktif siparişi veya reçetesi olan müşteriler silinemez)')) return;
        try {
            await api.delete(`/customers/${id}`);
            fetchCustomers();
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert(error.response?.data?.message || 'Silme işlemi başarısız.');
        }
    };

    const openModal = (customer = null) => {
        if (customer) {
            setCurrentCustomer(customer);
            setFormData({
                Unvan: customer.Unvan,
                VKN: customer.VKN || '',
                Adres: customer.Adres || '',
                Iletisim: customer.Iletisim || ''
            });
        } else {
            setCurrentCustomer(null);
            setFormData({
                Unvan: '',
                VKN: '',
                Adres: '',
                Iletisim: ''
            });
        }
        setErrors({});
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentCustomer(null);
    };

    // Filter functionality
    const filteredCustomers = customers.filter(c => {
        const term = searchTerm.toLowerCase();
        const cleanTerm = term.replace(/\\s+/g, '');

        return (
            (c.Unvan && c.Unvan.toLowerCase().includes(term)) ||
            (c.VKN && c.VKN.replace(/\\s+/g, '').includes(cleanTerm))
        );
    });

    return (
        <div className={isEmbedded ? "" : "p-6 bg-gray-50 min-h-screen"}>
            <div className={`flex justify-between items-center mb-8 ${isEmbedded ? "mt-4" : ""}`}>
                {!isEmbedded && (
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Müşteri Tanımları</h1>
                        <p className="text-gray-500 mt-1">Müşteri hesapları ve ilgili işlemler</p>
                    </div>
                )}
                {isEmbedded && <div />}
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition shadow-sm font-medium"
                >
                    <Plus size={20} />
                    Yeni Müşteri
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Müşteri ünvanı veya Vergi No ile ara..."
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

            {/* Customers Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Müşteri Ünvanı / Adres</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">VKN / TC No</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">İletişim</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kayıt Tarihi</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Yükleniyor...</td>
                                </tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
                                </tr>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <tr key={customer.MusteriID} className="hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{customer.Unvan}</div>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{customer.Adres || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded inline-block">{customer.VKN || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{customer.Iletisim || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500">
                                                {customer.OlusturmaTarihi ? new Date(customer.OlusturmaTarihi).toLocaleDateString('tr-TR') : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/orders`, { state: { musteriId: customer.MusteriID } })}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                                                    title="Yeni Sipariş Oluştur"
                                                >
                                                    <Plus size={14} />
                                                    Sipariş
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/orders-list?musteriId=${customer.MusteriID}`)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                                                    title="Müşterinin Siparişleri"
                                                >
                                                    <ShoppingBag size={14} />
                                                    Liste
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/recipes`, { state: { musteriId: customer.MusteriID } })}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                                                    title="Özel Reçeteleri"
                                                >
                                                    <FileText size={14} />
                                                    Reçeteler
                                                </button>
                                                <button
                                                    onClick={() => openModal(customer)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition ml-2"
                                                    title="Düzenle"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(customer.MusteriID)}
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

            {/* Main Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Users size={20} className="text-blue-600" />
                                {currentCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
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
                                <label className="text-sm font-medium text-gray-700">Müşteri Ünvanı <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="Unvan"
                                    value={formData.Unvan}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition ${errors.Unvan ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Şirket veya Şahıs Ünvanı"
                                />
                                {errors.Unvan && <p className="text-xs text-red-500 mt-1">{errors.Unvan}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Vergi No / TC Kimlik No</label>
                                <input
                                    type="text"
                                    name="VKN"
                                    value={formData.VKN}
                                    onChange={handleInputChange}
                                    maxLength={11}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition font-mono ${errors.VKN ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="10 veya 11 Haneli"
                                />
                                {errors.VKN && <p className="text-xs text-red-500 mt-1">{errors.VKN}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">İletişim Bilgileri</label>
                                <input
                                    type="text"
                                    name="Iletisim"
                                    value={formData.Iletisim}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                                    placeholder="Telefon, E-posta vb."
                                />
                            </div>

                            <div className="space-y-1.5">
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
                                    {currentCustomer ? 'Güncelle' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
