import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Plus, Edit, Trash2, Search, Filter, ShieldCheck, X, Save, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Users = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullname: '',
        email: '',
        roleName: 'User'
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    // Fetch users immediately if Admin
    useEffect(() => {
        if (user?.role === 'Admin') {
            fetchUsers();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.username) newErrors.username = 'Kullanıcı adı zorunludur.';
        if (!currentUser && !formData.password) newErrors.password = 'Şifre zorunludur.'; // Required on create
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Geçerli bir e-posta adresi giriniz.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            if (currentUser) {
                await api.put(`/users/${currentUser.UserID}`, formData);
            } else {
                await api.post('/users', formData);
            }
            fetchUsers();
            closeModal();
        } catch (error) {
            console.error('Error saving user:', error);
            alert(error.response?.data?.message || 'Bir hata oluştu.');
        }
    };

    const handleDelete = async (id, currentUsername) => {
        if (currentUsername === user.username) {
            alert("Kendi hesabınızı silemezsiniz.");
            return;
        }

        if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/users/${id}`);
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert(error.response?.data?.message || 'Silme işlemi başarısız.');
        }
    };

    const openModal = (userToEdit = null) => {
        if (userToEdit) {
            setCurrentUser(userToEdit);
            setFormData({
                username: userToEdit.Username,
                password: '', // Leave blank so we don't accidentally override it unless meant to
                fullname: userToEdit.Fullname || '',
                email: userToEdit.Email || '',
                roleName: userToEdit.RoleName || 'User'
            });
        } else {
            setCurrentUser(null);
            setFormData({
                username: '',
                password: '',
                fullname: '',
                email: '',
                roleName: 'User'
            });
        }
        setErrors({});
        setShowPassword(false);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentUser(null);
    };

    const filteredUsers = users.filter(u => {
        const term = searchTerm.toLowerCase();
        return (
            u.Username.toLowerCase().includes(term) ||
            (u.Fullname && u.Fullname.toLowerCase().includes(term)) ||
            (u.Email && u.Email.toLowerCase().includes(term))
        );
    });

    if (user?.role !== 'Admin') {
        return (
            <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <ShieldCheck size={64} className="mx-auto text-red-400" />
                    <h2 className="text-2xl font-bold text-gray-800">Erişim Engellendi</h2>
                    <p className="text-gray-500">Bu sayfayı görüntülemek için Yönetici (Admin) yetkisine sahip olmalısınız.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Kullanıcı Yönetimi</h1>
                    <p className="text-gray-500 mt-1">Sisteme erişebilen tüm kullanıcılar ve yetkileri</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition shadow-sm"
                >
                    <Plus size={20} />
                    Yeni Kullanıcı
                </button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Kullanıcı adı, isim veya e-posta ile ara..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kullanıcı Adı</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">İsim / E-posta</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Yetki Grubu</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">Yükleniyor...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.UserID} className="hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{u.Username}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{u.Fullname || '-'}</div>
                                            <div className="text-sm text-gray-500">{u.Email || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.RoleName === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {u.RoleName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openModal(u)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                    title="Düzenle"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u.UserID, u.Username)}
                                                    className={`p-2 rounded-lg transition ${u.Username === user.username
                                                        ? 'text-gray-300 cursor-not-allowed'
                                                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                                        }`}
                                                    title="Sil"
                                                    disabled={u.Username === user.username}
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
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {currentUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Oluştur'}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Kullanıcı Adı *</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition ${errors.username ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Giriş yaparken kullanılacak isim"
                                />
                                {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Şifre {currentUser && '(Değiştirmek istemiyorsanız boş bırakın)'} *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                                        placeholder="Min. 6 karakter"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Ad Soyad</label>
                                <input
                                    type="text"
                                    name="fullname"
                                    value={formData.fullname}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                                    placeholder="Kişinin Tam Adı"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">E-posta</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Email adresi"
                                />
                                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Yetki Grubu (Rol)</label>
                                <select
                                    name="roleName"
                                    value={formData.roleName}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition bg-white"
                                >
                                    <option value="User">Standart Kullanıcı (User)</option>
                                    <option value="Admin">Yönetici (Admin)</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition text-sm font-medium flex items-center gap-2"
                                >
                                    <Save size={18} />
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
