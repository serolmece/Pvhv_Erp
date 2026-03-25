import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, Table, DatePicker, message, Row, Col, Typography, Space } from 'antd';
import { PlusOutlined, SaveOutlined, DeleteOutlined, ExperimentOutlined } from '@ant-design/icons';
import api from '../api/axios';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import DecimalInput from '../components/DecimalInput';

const { Option } = Select;
const { Title, Text } = Typography;

const OrderEntry = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [stocks, setStocks] = useState([]);

    const [orderData, setOrderData] = useState({
        musteriId: location.state?.musteriId || null,
        teslimTarihi: null,
    });

    const [items, setItems] = useState([]);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, stockRes] = await Promise.all([
                    api.get('/customers'),
                    api.get('/recipes/stocks')
                ]);
                setCustomers(custRes.data);
                setStocks(stockRes.data);
            } catch (error) {
                console.error(error);
                message.error('Veriler yüklenirken hata oluştu.');
            }
        };
        fetchData();
    }, []);

    const handleAddItem = () => {
        setItems([...items, { key: Date.now(), urunId: null, miktar: 1, recipes: [], ozelReceteId: null }]);
    };

    const handleRemoveItem = (key) => {
        setItems(items.filter(item => item.key !== key));
    };

    const handleProductChange = async (key, urunId) => {
        // Update product ID
        const newItems = items.map(item => {
            if (item.key === key) return { ...item, urunId, recipes: [], ozelReceteId: null };
            return item;
        });
        setItems(newItems);

        // Fetch recipes for this product
        try {
            const res = await api.get(`/recipes/by-product/${urunId}`);
            setItems(prevItems => prevItems.map(item => {
                if (item.key === key) {
                    return { ...item, recipes: res.data };
                }
                return item;
            }));
        } catch (error) {
            console.error('Error fetching recipes:', error);
        }
    };

    const handleItemChange = (key, field, value) => {
        setItems(items.map(item => {
            if (item.key === key) return { ...item, [field]: value };
            return item;
        }));
    };

    const handleSaveOrder = async () => {
        if (!orderData.musteriId) {
            message.warning('Lütfen bir müşteri seçiniz.');
            return;
        }
        if (items.length === 0) {
            message.warning('En az bir ürün ekleyiniz.');
            return;
        }
        // Basic validation for items
        for (const item of items) {
            if (!item.urunId) {
                message.warning('Tüm satırlar için ürün seçilmelidir.');
                return;
            }
        }

        const payload = {
            musteriId: orderData.musteriId,
            teslimTarihi: orderData.teslimTarihi ? orderData.teslimTarihi.format('YYYY-MM-DD') : null,
            items: items.map(i => ({
                urunId: i.urunId,
                miktar: i.miktar,
                ozelReceteId: i.ozelReceteId
            }))
        };

        try {
            setLoading(true);
            await api.post('/orders', payload);
            message.success('Sipariş başarıyla oluşturuldu.');
            // Reset form
            setOrderData({ musteriId: null, teslimTarihi: null });
            setItems([]);
        } catch (error) {
            console.error(error);
            message.error('Sipariş oluşturulamadı.');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Ürün',
            dataIndex: 'urunId',
            key: 'urunId',
            render: (text, record) => (
                <Select
                    showSearch
                    style={{ width: 250 }}
                    placeholder="Ürün Seçin"
                    optionFilterProp="children"
                    value={text}
                    onChange={(val) => handleProductChange(record.key, val)}
                    filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                >
                    {stocks.map(s => (
                        <Option key={s.StokID} value={s.StokID}>{s.StokAdi} ({s.StokKodu})</Option>
                    ))}
                </Select>
            )
        },
        {
            title: 'Miktar',
            dataIndex: 'miktar',
            key: 'miktar',
            width: 120,
            render: (text, record) => (
                <DecimalInput
                    className="ant-input"
                    value={text}
                    onChange={(e) => handleItemChange(record.key, 'miktar', e.target.value)}
                />
            )
        },
        {
            title: 'Reçete Seçimi',
            key: 'recipe',
            width: 300,
            render: (_, record) => (
                <Space>
                    <Select
                        style={{ width: 200 }}
                        placeholder={record.recipes && record.recipes.length > 0 ? "Reçete Seçin" : "Reçete Yok"}
                        value={record.ozelReceteId}
                        onChange={(val) => handleItemChange(record.key, 'ozelReceteId', val)}
                        disabled={!record.urunId}
                        allowClear
                    >
                        {record.recipes && record.recipes.map(r => (
                            <Option key={r.ReceteID} value={r.ReceteID}>
                                {r.Aciklama || `Reçete #${r.ReceteID}`} {r.MusteriUnvan ? `(Özel: ${r.MusteriUnvan})` : ''} - {new Date(r.OlusturmaTarihi).toLocaleDateString()}
                            </Option>
                        ))}
                    </Select>

                    <Button
                        type="link"
                        icon={<ExperimentOutlined />}
                        onClick={() => {
                            // Open in new tab so we don't lose order data
                            window.open('/recipes', '_blank');
                        }}
                    >
                        Yeni Reçete
                    </Button>
                </Space>
            )
        },
        {
            title: 'İşlem',
            key: 'action',
            render: (_, record) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveItem(record.key)} />
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={2}>Sipariş Girişi</Title>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ marginRight: 10, border: '1px solid orange', padding: '5px', borderRadius: '5px', fontSize: '12px', color: 'orange' }}>
                        * Yeni Reçete Oluşturursanız, listeyi yenilemek için sayfayı yenilemeniz gerekebilir (veya ürünü tekrar seçin).
                    </div>
                </div>
            </div>

            <Card style={{ marginBottom: 20 }}>
                <Form layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="Müşteri Seçin">
                                <Select
                                    showSearch
                                    placeholder="Müşteri Ara..."
                                    optionFilterProp="children"
                                    value={orderData.musteriId}
                                    onChange={(val) => setOrderData({ ...orderData, musteriId: val })}
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                    }
                                >
                                    {customers.map(c => (
                                        <Option key={c.MusteriID} value={c.MusteriID}>
                                            {c.Unvan} ({c.VKN || 'VKN Yok'})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item label="Teslim Tarihi">
                                <DatePicker
                                    style={{ width: '100%' }}
                                    value={orderData.teslimTarihi}
                                    onChange={(date) => setOrderData({ ...orderData, teslimTarihi: date })}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>

            <Card title="Sipariş Kalemleri" extra={<Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem}>Ürün Ekle</Button>}>
                <Table
                    dataSource={items}
                    columns={columns}
                    pagination={false}
                    rowKey="key"
                    locale={{ emptyText: 'Henüz ürün eklenmedi.' }}
                />
            </Card>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
                <Button type="primary" size="large" icon={<SaveOutlined />} onClick={handleSaveOrder} loading={loading}>
                    Siparişi Oluştur
                </Button>
            </div>
        </div>
    );
};

export default OrderEntry;
