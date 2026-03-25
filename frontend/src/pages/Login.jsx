import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const success = await login(username, password);
        setLoading(false);

        if (success) {
            navigate('/');
        } else {
            setError('Geçersiz kullanıcı adı veya şifre');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e40af] via-[#1e3a8a] to-[#0f172a] relative overflow-hidden">
            {/* Arka plan dekoratif öğeleri - Referans projedeki derinlik hissi için */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#0f172a]/20 rounded-full blur-[120px]"></div>
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white/10 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-[440px] border border-white/20 relative z-10"
            >
                <div className="text-center mb-10">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="inline-flex items-center justify-center p-4 bg-white/10 rounded-2xl mb-6 shadow-xl border border-white/10"
                    >
                        <ShieldCheck className="w-10 h-10 text-white" />
                    </motion.div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Pvhv Food Erp</h1>
                    <p className="text-blue-200/70 font-medium tracking-wide text-sm">Giriş Yaparak Sisteme Erişin</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-blue-100/80 ml-1">Kullanıcı Adı</label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors">
                                <User className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-14 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:bg-white/10 focus:border-white/30 focus:ring-4 focus:ring-blue-500/10 transition-all text-white placeholder-white/20 font-semibold"
                                placeholder="kullanıcı adınız"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-blue-100/80 ml-1">Şifre</label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-14 pr-14 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:bg-white/10 focus:border-white/30 focus:ring-4 focus:ring-blue-500/10 transition-all text-white placeholder-white/20 font-semibold"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 rounded-2xl bg-red-500/10 text-red-100 text-xs font-bold text-center border border-red-500/20"
                        >
                            {error}
                        </motion.div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.01, translateY: -2 }}
                        whileTap={{ scale: 0.99 }}
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 px-6 bg-white text-blue-900 font-black rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.2)] hover:bg-slate-50 hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4 mt-6"
                    >
                        {loading ? (
                            <>
                                <div className="w-6 h-6 border-3 border-blue-900/30 border-t-blue-900 rounded-full animate-spin"></div>
                                <span>GİRİŞ YAPILIYOR</span>
                            </>
                        ) : (
                            <>
                                <span>GİRİŞ YAP</span>
                                <ShieldCheck className="w-5 h-5" />
                            </>
                        )}
                    </motion.button>
                </form>

                <div className="mt-12 flex items-center justify-center gap-4 opacity-30">
                    <div className="h-[1px] w-8 bg-blue-100"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100">
                        V1.2 PRODUCTION
                    </span>
                    <div className="h-[1px] w-8 bg-blue-100"></div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
