import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import api from '../api/axios';
import { Card, Table, Button, Typography, message, Tag, Space, Modal, Form, Input, DatePicker, Popconfirm } from 'antd';
import { CheckCircleOutlined, EyeOutlined, PlusOutlined, SettingOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import DecimalInput from '../components/DecimalInput';

const { Title, Text } = Typography;

const OrdersList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { refreshTrigger } = useOutletContext();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [producingId, setProducingId] = useState(null);
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [currentOrderDetails, setCurrentOrderDetails] = useState([]);

    const [needsModalVisible, setNeedsModalVisible] = useState(false);
    const [currentNeedsOrder, setCurrentNeedsOrder] = useState(null);
    const [currentOrderNeeds, setCurrentOrderNeeds] = useState([]);
    const [needsLoading, setNeedsLoading] = useState(false);
    const [purchasing, setPurchasing] = useState(false);

    const [productionModalVisible, setProductionModalVisible] = useState(false);
    const [currentProductionOrder, setCurrentProductionOrder] = useState(null);
    const [productionRecords, setProductionRecords] = useState([]);
    const [submittingProduction, setSubmittingProduction] = useState(false);
    const [editingProduction, setEditingProduction] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchOrders();
    }, [location.search, refreshTrigger]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const searchParams = new URLSearchParams(location.search);
            const musteriId = searchParams.get('musteriId');

            const url = musteriId
                ? `/orders?musteriId=${musteriId}`
                : `/orders`;

            const res = await api.get(url);
            setOrders(res.data);
        } catch (error) {
            console.error('Siparişler alınamadı', error);
            message.error('Sipariş listesi yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };

    const handleProduce = async (orderId) => {
        Modal.confirm({
            title: 'Üretimi Tamamla',
            content: 'Bu siparişi üretip stoklardan reçetedeki hammaddeleri düşmek istediğinize emin misiniz?',
            okText: 'Evet, Üret',
            cancelText: 'İptal',
            onOk: async () => {
                setProducingId(orderId);
                try {
                    await api.put(`/orders/${orderId}/produce`);
                    message.success('Üretim tamamlandı ve stoklar güncellendi.');
                    fetchOrders();
                } catch (error) {
                    console.error(error);
                    message.error(error.response?.data?.message || 'Üretim sırasında hata oluştu.');
                } finally {
                    setProducingId(null);
                }
            }
        });
    };

    const handleViewDetails = async (orderId) => {
        try {
            const res = await api.get(`/orders/${orderId}/items`);
            setCurrentOrderDetails(res.data);
            setDetailsVisible(true);
        } catch (error) {
            console.error(error);
            message.error('Sipariş detayları getirilemedi.');
        }
    };

    const handleOpenProduction = async (order) => {
        setCurrentProductionOrder(order);
        setProductionModalVisible(true);
        form.resetFields();
        fetchProductionRecords(order.SiparisID);
    };

    const fetchProductionRecords = async (orderId) => {
        try {
            // we need both the items to know what to produce, and the records to show history.
            const itemsRes = await api.get(`/orders/${orderId}/items`);
            setCurrentOrderDetails(itemsRes.data);

            const recordRes = await api.get(`/orders/${orderId}/production`);
            setProductionRecords(recordRes.data);
        } catch (error) {
            console.error(error);
            message.error('Üretim verileri alınamadı.');
        }
    };

    const handleProductionSubmit = async (values) => {
        try {
            setSubmittingProduction(true);
            const payload = {
                kalemId: values.kalemId,
                uretimTarihi: values.uretimTarihi.format('YYYY-MM-DD'),
                uretilenMiktar: parseFloat(values.uretilenMiktar),
                aciklama: values.aciklama
            };

            if (editingProduction) {
                await api.put(`/orders/${currentProductionOrder.SiparisID}/production/${editingProduction}`, payload);
                message.success('Üretim kaydı güncellendi ve stoklar dengelendi.');
            } else {
                await api.post(`/orders/${currentProductionOrder.SiparisID}/production`, payload);
                message.success('Günlük üretim kaydedildi ve stoktan düşüldü.');
            }

            form.resetFields();
            setEditingProduction(null);
            fetchProductionRecords(currentProductionOrder.SiparisID);
            fetchOrders(); // refresh main list to check if status changed to completed
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.message || 'İşlem sırasında hata oluştu.');
        } finally {
            setSubmittingProduction(false);
        }
    };

    const handleEditProductionClick = (record) => {
        setEditingProduction(record.UretimID);
        form.setFieldsValue({
            kalemId: record.KalemID,
            uretimTarihi: dayjs(record.UretimTarihi),
            uretilenMiktar: record.UretilenMiktar,
            aciklama: record.Aciklama
        });
    };

    const handleDeleteProductionClick = async (record) => {
        Modal.confirm({
            title: 'Üretim Kaydını Sil',
            content: 'Bu üretim kaydını iptal edip, düşülen stokları geri iade etmek istediğinize emin misiniz?',
            okText: 'Evet, Sil ve İade Et',
            cancelText: 'İptal',
            onOk: async () => {
                try {
                    await api.delete(`/orders/${currentProductionOrder.SiparisID}/production/${record.UretimID}`);
                    message.success('Üretim kaydı silindi ve stoklara iade edildi.');

                    if (editingProduction === record.UretimID) {
                        form.resetFields();
                        setEditingProduction(null);
                    }

                    fetchProductionRecords(currentProductionOrder.SiparisID);
                    fetchOrders();
                } catch (error) {
                    console.error(error);
                    message.error(error.response?.data?.message || 'Silme işlemi sırasında hata oluştu.');
                }
            }
        });
    };

    const handleViewNeeds = async (order) => {
        setCurrentNeedsOrder(order);
        setNeedsModalVisible(true);
        setNeedsLoading(true);
        setCurrentOrderNeeds([]);
        try {
            const res = await api.get(`/orders/${order.SiparisID}/needs`);
            setCurrentOrderNeeds(res.data);
        } catch (error) {
            console.error(error);
            message.error('İhtiyaç analizi alınamadı.');
        } finally {
            setNeedsLoading(false);
        }
    };

    const handlePurchaseMissing = async () => {
        const missingItems = currentOrderNeeds.filter(item => item.EksikMiktar > 0);
        if (missingItems.length === 0) {
            message.info('Alınacak eksik malzeme yok.');
            return;
        }

        setPurchasing(true);
        try {
            for (const item of missingItems) {
                await api.post('/stock-movements', {
                    stokId: item.HammaddeID,
                    hareketTipi: 'Giris',
                    miktar: item.EksikMiktar,
                    birimFiyat: 0, 
                    kdvOrani: 18,
                    aciklama: `Sipariş İhtiyacı Otomatik Alım`
                });
            }
            message.success('Eksik malzemeler için stok girişi başarıyla yapıldı. Stoklar güncellendi.');
            setNeedsModalVisible(false);
        } catch (error) {
            console.error(error);
            message.error('Alım işlemi yapılırken hata oluştu.');
        } finally {
            setPurchasing(false);
        }
    };

    const handleExportNeedsExcel = () => {
        if (!currentOrderNeeds || currentOrderNeeds.length === 0) {
            message.warning('Dışa aktarılacak veri bulunamadı.');
            return;
        }

        const exportData = currentOrderNeeds.map(item => ({
            'Stok Kodu': item.StokKodu,
            'Malzeme/Ürün Adı': item.StokAdi,
            'Toplam İhtiyaç': item.ToplamIhtiyac,
            'Birim': item.AnaBirim,
            'Mevcut Stok': item.MevcutStok,
            'Eksik Miktar': item.EksikMiktar,
            'Durum': item.Durum
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "İhtiyaç Raporu");
        XLSX.writeFile(workbook, `Siparis_Ihtiyac_Raporu.xlsx`);
    };

    const columns = [
        {
            title: 'Sipariş No',
            dataIndex: 'SiparisID',
            key: 'SiparisID',
            width: 100,
            render: (text) => <Text strong>#{text}</Text>
        },
        {
            title: 'Müşteri',
            dataIndex: 'MusteriUnvan',
            key: 'MusteriUnvan',
            render: (text) => text || <Text type="secondary">Tanımsız Müşteri</Text>
        },
        {
            title: 'Sipariş Tarihi',
            dataIndex: 'SiparisTarihi',
            key: 'SiparisTarihi',
            render: (date) => new Date(date).toLocaleDateString('tr-TR')
        },
        {
            title: 'Durum',
            dataIndex: 'Durum',
            key: 'Durum',
            render: (status) => {
                let color = 'gold';
                if (status === 'Tamamlandı') color = 'green';
                else if (status === 'Üretimde') color = 'blue';
                return <Tag color={color}>{status || 'Belirsiz'}</Tag>;
            }
        },
        {
            title: 'İşlemler',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        type="default"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetails(record.SiparisID)}
                    >
                        Detaylar
                    </Button>
                    {record.Durum !== 'Tamamlandı' && (
                        <Button
                            type="dashed"
                            size="small"
                            icon={<SettingOutlined />}
                            onClick={() => handleOpenProduction(record)}
                        >
                            Üretim
                        </Button>
                    )}
                    {record.Durum !== 'Tamamlandı' && (
                        <Button
                            type="primary"
                            ghost
                            size="small"
                            onClick={() => handleViewNeeds(record)}
                        >
                            İhtiyaçlar
                        </Button>
                    )}
                    {record.Durum !== 'Tamamlandı' && (
                        <Popconfirm
                            title="Tüm Üretimi Otomatik Tamamla"
                            description="Tüm kalemleri üretilmiş varsayıp tamamen stoktan düşmek istiyor musunuz?"
                            onConfirm={() => handleProduce(record.SiparisID)}
                            okText="Evet"
                            cancelText="Hayır"
                        >
                            <Button
                                type="primary"
                                size="small"
                                icon={<CheckCircleOutlined />}
                                loading={producingId === record.SiparisID}
                            >
                                Toplu Tamamla
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            )
        }
    ];

    const detailColumns = [
        { title: 'Ürün', dataIndex: 'UrunAdi', key: 'UrunAdi' },
        { title: 'Miktar', dataIndex: 'Miktar', key: 'Miktar' },
        { title: 'Birim', dataIndex: 'AnaBirim', key: 'AnaBirim' },
        { title: 'Reçete ID', dataIndex: 'OzelReceteID', key: 'OzelReceteID', render: (val) => val ? `#${val}` : 'Yok' }
    ];

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Siparişler ve Üretim</Title>
                    <Text type="secondary">Müşteri siparişlerini yönetin ve üretime alıp stoktan düşün</Text>
                </div>
                <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => navigate('/orders')}>
                    Yeni Sipariş Ekle
                </Button>
            </div>

            <Card className="shadow-sm">
                <Table
                    columns={columns}
                    dataSource={orders}
                    rowKey="SiparisID"
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                />
            </Card>

            <Modal
                title="Sipariş Detayları"
                open={detailsVisible}
                onCancel={() => setDetailsVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setDetailsVisible(false)}>Kapat</Button>
                ]}
                width={700}
            >
                <Table
                    columns={detailColumns}
                    dataSource={currentOrderDetails}
                    rowKey="KalemID"
                    pagination={false}
                />
            </Modal>

            <Modal
                title={`Sipariş İhtiyaç Raporu - ${currentNeedsOrder ? `Sipariş #${currentNeedsOrder.SiparisID} ${currentNeedsOrder.MusteriUnvan ? `(${currentNeedsOrder.MusteriUnvan})` : ''}` : '(Hammadde)'}`}
                open={needsModalVisible}
                onCancel={() => setNeedsModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setNeedsModalVisible(false)}>Kapat</Button>,
                    <Button key="excel" icon={<DownloadOutlined />} onClick={handleExportNeedsExcel}>
                        Excel İndir
                    </Button>,
                    currentOrderNeeds.some(n => n.EksikMiktar > 0) && (
                        <Popconfirm
                            key="buy"
                            title="Eksik Malzemeleri Satın Al"
                            description="Listede eksik görünen tüm malzemeler için otomatik olarak stok girişi (alım) yapılsın mı?"
                            onConfirm={handlePurchaseMissing}
                            okText="Evet, Alım Yap"
                            cancelText="Hayır"
                        >
                            <Button type="primary" loading={purchasing}>
                                Eksik Malzemeleri Satın Al
                            </Button>
                        </Popconfirm>
                    )
                ]}
                width={800}
            >
                <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                        Bu liste, siparişte **henüz üretilmemiş** ürünler için reçetedeki hammaddelere göre hesaplanan ihtiyacı ve mevcut stoğu gösterir. "Eksik" olan kalemler, üretimi tamamlayabilmeniz için dışarıdan almanız (stok girişi yapmanız) gereken miktardır.
                    </Text>
                </div>
                <Table
                    loading={needsLoading}
                    dataSource={currentOrderNeeds}
                    rowKey="HammaddeID"
                    pagination={false}
                    columns={[
                        { title: 'Stok Kodu', dataIndex: 'StokKodu' },
                        { title: 'Malzeme', dataIndex: 'StokAdi' },
                        { title: 'Toplam İhtiyaç', dataIndex: 'ToplamIhtiyac', render: (val, row) => <Text strong>{val.toFixed(2)} {row.AnaBirim}</Text> },
                        { title: 'Mevcut Stok', dataIndex: 'MevcutStok', render: (val, row) => <Text>{val.toFixed(2)} {row.AnaBirim}</Text> },
                        {
                            title: 'Eksik',
                            dataIndex: 'EksikMiktar',
                            render: (val, row) => val > 0 ? <Text type="danger" strong>{val.toFixed(2)} {row.AnaBirim}</Text> : <Text type="success">0</Text>
                        },
                        {
                            title: 'Durum',
                            dataIndex: 'Durum',
                            render: (val) => val === 'Yeterli' ? <Tag color="green">Yeterli</Tag> : <Tag color="red">Yetersiz</Tag>
                        }
                    ]}
                />
            </Modal>

            {/* Production Tracking Modal */}
            <Modal
                title={`Günlük Üretim Takibi - Sipariş #${currentProductionOrder?.SiparisID}`}
                open={productionModalVisible}
                onCancel={() => {
                    setProductionModalVisible(false);
                    setEditingProduction(null);
                    form.resetFields();
                }}
                footer={null}
                width={900}
            >
                <div style={{ marginBottom: 24, padding: 16, backgroundColor: editingProduction ? '#fffbe6' : 'transparent', border: editingProduction ? '1px solid #ffe58f' : 'none', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={5}>{editingProduction ? 'Üretim Kaydını Düzenle' : 'Yeni Üretim Kaydı Ekle'}</Title>
                        {editingProduction && (
                            <Button type="link" onClick={() => { setEditingProduction(null); form.resetFields(); }}>
                                İptal Et / Yeni Ekle
                            </Button>
                        )}
                    </div>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleProductionSubmit}
                    >
                        <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                            <Form.Item
                                name="kalemId"
                                label="Üretilen Ürün"
                                rules={[{ required: true, message: 'Ürün seçiniz!' }]}
                                style={{ width: 250 }}
                            >
                                <select className="ant-input" style={{ width: '100%' }}>
                                    <option value="">Seçiniz</option>
                                    {currentOrderDetails.map(item => {
                                        const prodSoFar = productionRecords.filter(p => p.KalemID === item.KalemID).reduce((a, b) => a + b.UretilenMiktar, 0);
                                        const remaining = item.Miktar - prodSoFar;
                                        return (
                                            <option key={item.KalemID} value={item.KalemID} disabled={remaining <= 0}>
                                                {item.UrunAdi} (Kalan: {remaining > 0 ? remaining : 0} {item.AnaBirim})
                                            </option>
                                        );
                                    })}
                                </select>
                            </Form.Item>

                            <Form.Item
                                name="uretimTarihi"
                                label="Tarih"
                                rules={[{ required: true, message: 'Tarih seçiniz!' }]}
                                initialValue={dayjs()}
                            >
                                <DatePicker format="DD/MM/YYYY" style={{ width: 150 }} />
                            </Form.Item>

                            <Form.Item
                                name="uretilenMiktar"
                                label="Üretilen Adet/Gr"
                                rules={[{ required: true, message: 'Miktar giriniz!' }]}
                            >
                                <DecimalInput className="ant-input" style={{ width: 150 }} />
                            </Form.Item>

                            <Form.Item
                                name="aciklama"
                                label="Açıklama (Opsiyonel)"
                            >
                                <Input style={{ width: 200 }} />
                            </Form.Item>

                            <Form.Item label=" ">
                                <Button type="primary" htmlType="submit" loading={submittingProduction} icon={<PlusOutlined />}>
                                    {editingProduction ? 'Kaydet & Stoğu Güncelle' : 'Kaydet & Stoktan Düş'}
                                </Button>
                            </Form.Item>
                        </Space>
                    </Form>
                </div>

                <Title level={5}>Geçmiş Üretim Kayıtları</Title>
                <Table
                    dataSource={productionRecords}
                    rowKey="UretimID"
                    pagination={{ pageSize: 5 }}
                    size="small"
                    columns={[
                        { title: 'Tarih', dataIndex: 'UretimTarihi', render: d => new Date(d).toLocaleDateString('tr-TR') },
                        { title: 'Ürün', dataIndex: 'UrunAdi' },
                        { title: 'Üretilen Miktar', dataIndex: 'UretilenMiktar', render: (val, record) => <Text strong type="success">+{val} {record.AnaBirim}</Text> },
                        { title: 'Açıklama', dataIndex: 'Aciklama' },
                        {
                            title: 'İşlem',
                            key: 'action',
                            render: (_, record) => (
                                <Space>
                                    <Button type="link" size="small" onClick={() => handleEditProductionClick(record)}>Düzenle</Button>
                                    <Button type="link" danger size="small" onClick={() => handleDeleteProductionClick(record)}>Sil</Button>
                                </Space>
                            )
                        }
                    ]}
                />
            </Modal>
        </div>
    );
};

export default OrdersList;
