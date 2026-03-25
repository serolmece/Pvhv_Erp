import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle, Clock, Box, Truck } from 'lucide-react';
import { Collapse, Steps, Typography, Card, Divider, theme } from 'antd';
import { CaretRightOutlined, SettingOutlined, SolutionOutlined, ShoppingCartOutlined, AppstoreOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../api/axios';

const { Panel } = Collapse;
const { Title, Text, Paragraph } = Typography;

const InfoCard = ({ icon: Icon, label, value, color = "blue", subtext }) => (
    <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start space-x-4 h-full"
    >
        <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
            {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
    </motion.div>
);

const UserManual = () => {
    const { token } = theme.useToken();

    const steps = [
        {
            title: '1. Başlangıç ve Tanımlamalar',
            status: 'process',
            icon: <AppstoreOutlined />,
            description: (
                <div style={{ marginTop: 10 }}>
                    <Text strong>İlk Adım:</Text> Sistemin temel taşlarını oluşturun.
                    <ul style={{ listStyleType: 'circle', marginLeft: 20, marginTop: 5 }}>
                        <li><Text mark>Kategoriler Önemli:</Text> Sistemde hem hammaddeler hem de asıl üretilecek "Bitmiş Ürünler" aynı Stok Kartı menüsünden eklenir. Raporlarda ve seçim ekranlarında karışıklık olmaması için öncelikle Kategoriler bölümünden <Text code>Hammaddeler</Text> ve <Text code>Üretilen Ürünler</Text> gibi ayrıştırıcı kategoriler açmanız tavsiye edilir.</li>
                        <li><Text mark>Stok ve Ürünler:</Text> Hammaddeden bitmiş ambalaja kadar her şeyi "Stok Kartı" olarak sisteme tanıtın (Üretilecek asıl ürünü de ilgili kategorisiyle bu aşamada girin).</li>
                        <li><Text mark>Müşteri & Tedarikçi:</Text> Sipariş alacağınız müşterileri ve malzeme çektiğiniz tedarikçileri tanımlayın.</li>
                    </ul>
                </div>
            ),
        },
        {
            title: '2. Reçeteler (Üretim Planı)',
            status: 'process',
            icon: <SolutionOutlined />,
            description: (
                <div style={{ marginTop: 10 }}>
                    <Text strong>Üretim Hazırlığı:</Text> Ürünlerin "nasıl" ve "kimin için" üretileceğini belirleyin.
                    <ul style={{ listStyleType: 'circle', marginLeft: 20, marginTop: 5 }}>
                        <li>Menüden <Text code>Reçeteler (Üretim Planı)</Text> bölümüne gidin.</li>
                        <li>Yukarıdan, üretimi yapılacak olan nihai (bitmiş) ürün kartını seçin.</li>
                        <li>Dilerseniz bu formülü "Genel" bırakabilir veya sadece spesifik bir kullanıcıya özel (Örn. X Müşterisi Özel) tanımlayabilirsiniz.</li>
                        <li>Gerekli malzemeleri/hammaddeleri ve miktarlarını ekleyip "Kaydet"e basın.</li>
                    </ul>
                </div>
            ),
        },
        {
            title: '3. Sipariş Alma ve Stoktan Düşüm',
            status: 'process',
            icon: <ShoppingCartOutlined />,
            description: (
                <div style={{ marginTop: 10 }}>
                    <Text strong>Satıştan Üretime Geçiş:</Text> Siparişlerin tam entegre sistemle yönetilmesi.
                    <ul style={{ listStyleType: 'circle', marginLeft: 20, marginTop: 5 }}>
                        <li><Text code>Müşteriler</Text> listesinden veya "Siparişler" menüsünden girerek bir müşteri siparişi oluşturun.</li>
                        <li>Siparişi verirken, o müşteri için hazırlanmış özel bir reçete varsa yanından seçin.</li>
                        <li><Text type="success" strong>Oto-Stok Düşüm:</Text> Soldaki <Text code>Sipariş ve Üretim</Text> listesine gidip <Text mark>"Üretimi Tamamla"</Text> butonuna tıkladığınız anda; sipariş "Tamamlandı" statüsüne geçer ve reçetedeki tüm parçalar / hammaddeler, adetleri hesaplanarak **ana stounuzdan otomatik olarak düşülür.**</li>
                    </ul>
                </div>
            ),
        },
    ];

    return (
        <Card
            title={<Title level={4} style={{ margin: 0 }}><SettingOutlined /> PvhvErp Kullanım Kılavuzu</Title>}
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
        >
            <Collapse
                bordered={false}
                defaultActiveKey={[]}
                expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
                style={{ background: token.colorBgContainer }}
            >
                <Panel header={<Text strong style={{ fontSize: 16 }}>Adım Adım Sistem Kullanımı</Text>} key="1" style={{ border: 'none' }}>
                    <Steps
                        direction="vertical"
                        current={-1} // No active step by default
                        items={steps}
                    />
                </Panel>
            </Collapse>
        </Card>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const { refreshTrigger } = useOutletContext();
    const [stockData, setStockData] = useState([]);
    const [todayPayments, setTodayPayments] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [pendingTotal, setPendingTotal] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const [completedTotal, setCompletedTotal] = useState(0);
    const [criticalStockCount, setCriticalStockCount] = useState(0);
    const [categoryCount, setCategoryCount] = useState(0);
    const [movementCount, setMovementCount] = useState(0);
    const [paymentData, setPaymentData] = useState([]);
    const [rates, setRates] = useState({ usd: 0, eur: 0, parity: 0 });

    // Fetch Dashboard Data
    useEffect(() => {
        fetchDashboardData();
        fetchRates();
    }, [refreshTrigger]);

    const fetchRates = async () => {
        try {
            // Using a public API for rates
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await res.json();
            const usdTry = data.rates.TRY;
            
            const resEur = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
            const dataEur = await resEur.json();
            const eurTry = dataEur.rates.TRY;
            
            setRates({
                usd: usdTry,
                eur: eurTry,
                parity: dataEur.rates.USD // EUR/USD parity
            });
        } catch (error) {
            console.error("Döviz kurları çekilemedi:", error);
        }
    };

    const fetchDashboardData = async () => {
        try {
            const res = await api.get('/payments');
            const allPayments = res.data;

            // Bugünün ödemeleri (Tarihi bugün olan, ödenmemişler)
            const today = new Date().toISOString().split('T')[0];
            const todaysPending = allPayments.filter(p => !p.OdendiMi && p.VadeTarihi?.startsWith(today));
            setTodayPayments(todaysPending);

            // Bekleyen toplamlar
            const allPending = allPayments.filter(p => !p.OdendiMi);
            setPendingCount(allPending.length);
            const total = allPending.reduce((acc, curr) => acc + parseFloat(curr.Tutar), 0);
            setPendingTotal(total);

            // Tamamlanan toplamlar
            const allCompleted = allPayments.filter(p => p.OdendiMi);
            setCompletedCount(allCompleted.length);
            const cTotal = allCompleted.reduce((acc, curr) => acc + parseFloat(curr.Tutar || 0), 0);
            setCompletedTotal(cTotal);

            // Stok Verilerini Çek
            const stockRes = await api.get('/stock-cards');
            const allStock = stockRes.data;

            let criticalCount = 0;
            const topStockData = [];

            allStock.forEach(item => {
                const mevcut = parseFloat(item.MevcutStok) || 0;
                const minLevel = parseFloat(item.MinStokSeviyesi) || 0;

                if (mevcut <= minLevel) {
                    criticalCount++;
                }

                if (topStockData.length < 15) {
                    topStockData.push({
                        name: item.StokAdi || item.StokKodu,
                        stock: mevcut,
                        critical: minLevel
                    });
                }
            });

            setCriticalStockCount(criticalCount);
            setStockData(topStockData);

            // Categories - Fetch explicitly for all-round refresh
            try {
                const catRes = await api.get('/stock-cards/categories');
                setCategoryCount(catRes.data?.length || 0);
            } catch (err) {
                console.error("Categories refresh error", err);
            }

            // Movements - Fetch explicitly for all-round refresh
            try {
                const movRes = await api.get('/stock-movements');
                setMovementCount(movRes.data?.length || 0);
            } catch (err) {
                console.error("Movements refresh error", err);
            }

            // Ödeme Grafiği
            setPaymentData([
                { name: 'Ödenmiş', value: allCompleted.length },
                { name: 'Beklemede', value: allPending.length },
            ]);
        } catch (error) {
            console.error("Dashboard veri çekme hatası:", error);
        }
    };

    const handleMarkAsPaid = async (id) => {
        try {
            await api.post(`/payments/${id}/pay`);
            fetchDashboardData();
        } catch (err) {
            console.error(err);
        }
    };

    const COLORS = ['#10b981', '#fbbf24', '#ef4444']; // Green, Yellow, Red

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Currency Ticker */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-8 overflow-x-auto whitespace-nowrap scrollbar-hide"
            >
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Piyasa Özeti (Google Finance)</span>
                </div>
                
                <div className="flex items-center gap-6 divide-x divide-gray-100">
                    <div className="pl-6 flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-600">USD/TRY</span>
                        <span className="text-sm font-bold text-gray-900">{rates.usd ? rates.usd.toFixed(4) : "---"}</span>
                    </div>
                    
                    <div className="pl-6 flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-600">EUR/TRY</span>
                        <span className="text-sm font-bold text-gray-900">{rates.eur ? rates.eur.toFixed(4) : "---"}</span>
                    </div>
                    
                    <div className="pl-6 flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-600">EUR/USD</span>
                        <span className="text-sm font-bold text-blue-600">{rates.parity ? rates.parity.toFixed(4) : "---"}</span>
                    </div>
                </div>
                
                <div className="ml-auto text-[10px] text-gray-400 italic">
                    * Veriler gecikmeli olabilir
                </div>
            </motion.div>

            {/* Table Widget - Moved to Top */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <AlertCircle className="text-amber-500" size={20} />
                        Bugün Yapılacak Ödemeler
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cari Hesap</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Konu</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tutar</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {todayPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-gray-500">Bugün için bekleyen ödeme bulunmuyor.</td>
                                </tr>
                            ) : todayPayments.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 text-sm font-medium text-gray-800">{row.CariAdi}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600">{row.Konu}</td>
                                    <td className="py-3 px-4 text-sm font-semibold text-gray-800">{row.Tutar} {row.DovizTipi}</td>
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => handleMarkAsPaid(row.OdemeID)}
                                            className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                                            title="Ödendi olarak işaretle"
                                        >
                                            <CheckCircleOutlined /> Ödendi İşaretle
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <InfoCard
                    icon={CheckCircle}
                    label="Tamamlanan Ödemeler"
                    value={`₺${completedTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
                    color="emerald"
                    subtext={`${completedCount} adet işlem`}
                />
                <InfoCard
                    icon={Clock}
                    label="Bekleyen Ödemeler"
                    value={`₺${pendingTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
                    color="amber"
                    subtext={`${pendingCount} adet işlem`}
                />
                <InfoCard
                    icon={AlertCircle}
                    label="Kritik Stok"
                    value={`${criticalStockCount} Ürün`}
                    color="red"
                    subtext="Stok yenilenmeli"
                />
                <InfoCard
                    icon={Box}
                    label="Kategoriler"
                    value={`${categoryCount} Kategori`}
                    color="indigo"
                    subtext="Aktif Stok Grupları"
                />
                <InfoCard
                    icon={Truck}
                    label="Stok Hareketleri"
                    value={`${movementCount} İşlem`}
                    color="blue"
                    subtext="Tüm Geçmiş Giriş/Çıkış"
                />
            </div>

            {/* User Manual Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <UserManual />
            </motion.div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Stock Widget */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Stok Seviyeleri</h3>
                    <div className="w-full" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stockData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="stock" fill="#6366f1" radius={[4, 4, 0, 0]} name="Mevcut Stok" />
                                <Bar dataKey="critical" fill="#ef4444" radius={[4, 4, 0, 0]} name="Kritik Seviye" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Payment Widget */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Ödeme Durumu</h3>
                    <div className="w-full" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={paymentData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {paymentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
