import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, Table, Row, Col, Typography, message, Space, Divider } from 'antd';
import { PlusOutlined, SaveOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import api from '../api/axios';
import { useLocation } from 'react-router-dom';
import DecimalInput from './DecimalInput';

const { Option } = Select;
const { Title, Text } = Typography;

const RecipeDefinition = ({ editRecipeId, onFinish }) => {
    const location = useLocation();
    const [stocks, setStocks] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [existingRecipes, setExistingRecipes] = useState([]); // All available recipes to copy from
    const [loadingRecipes, setLoadingRecipes] = useState(false);
    const [selectedCopyRecipe, setSelectedCopyRecipe] = useState(null); // Selected recipe to copy

    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(location.state?.musteriId || null);

    const [recipeDescription, setRecipeDescription] = useState('');
    const [recipeItems, setRecipeItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch stocks, customers and all recipes on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const stockRes = await api.get('/recipes/stocks');
                setStocks(stockRes.data);

                const cusRes = await api.get('/customers');
                setCustomers(cusRes.data);

                // Fetch all recipes to allow copying from any product's recipe
                setLoadingRecipes(true);
                const recRes = await api.get('/recipes');
                setExistingRecipes(recRes.data);
                setLoadingRecipes(false);
            } catch (error) {
                console.error(error);
                message.error('Veriler yüklenemedi.');
                setLoadingRecipes(false);
            }
        };
        fetchInitialData();
    }, []);

    // Clear selected copy recipe when product changes (optional)
    useEffect(() => {
        setSelectedCopyRecipe(null);
    }, [selectedProduct]);

    const handleCopyRecipe = async (recipeId) => {
        setSelectedCopyRecipe(recipeId);
        if (!recipeId) return;

        try {
            const res = await api.get(`/recipes/${recipeId}`);
            const { header, items } = res.data;

            // Fill form with copied data
            setRecipeDescription(`${header.Aciklama || ''} (Kopya)`);
            setSelectedCustomer(header.MusteriID || null);

            const newItems = items.map(item => {
                const stock = stocks.find(s => s.StokID === item.HammaddeID);
                return {
                    key: Date.now() + Math.random(),
                    hammaddeId: item.HammaddeID,
                    miktar: item.Miktar,
                    birim: item.Birim,
                    birimFiyat: stock ? (stock.SonAlisFiyati || 0) : 0,
                    hedefUrunAdedi: item.HedefUrunAdedi || 1,
                    maliyet: (stock ? (stock.SonAlisFiyati || 0) : 0) * (item.Miktar / (item.HedefUrunAdedi || 1))
                };
            });
            setRecipeItems(newItems);
            message.info('Reçete içeriği yüklendi. Değişiklik yapıp yeni olarak kaydedebilirsiniz.');

        } catch (error) {
            console.error(error);
            message.error('Reçete detayları yüklenemedi.');
        }
    };

    // Load recipe data for Editing
    useEffect(() => {
        if (editRecipeId) {
            const fetchRecipeForEdit = async () => {
                setLoading(true);
                try {
                    const res = await api.get(`/recipes/${editRecipeId}`);
                    const { header, items } = res.data;

                    setSelectedProduct(header.UrunID);
                    setRecipeDescription(header.Aciklama || '');
                    setSelectedCustomer(header.MusteriID || null);

                    const newItems = items.map(item => {
                        const stock = stocks.find(s => s.StokID === item.HammaddeID);
                        return {
                            key: Date.now() + Math.random(),
                            hammaddeId: item.HammaddeID,
                            miktar: item.Miktar,
                            birim: item.Birim,
                            birimFiyat: stock ? (stock.SonAlisFiyati || 0) : 0,
                            hedefUrunAdedi: item.HedefUrunAdedi || 1,
                            maliyet: (stock ? (stock.SonAlisFiyati || 0) : 0) * (item.Miktar / (item.HedefUrunAdedi || 1))
                        };
                    });
                    setRecipeItems(newItems);
                    setSelectedCopyRecipe(null);
                } catch (error) {
                    message.error('Düzenlenecek reçete verileri yüklenemedi.');
                } finally {
                    setLoading(false);
                }
            };
            if (stocks.length > 0) {
                fetchRecipeForEdit();
            }
        } else {
            // Reset if canceled edit
            setRecipeDescription('');
            setSelectedCustomer(null);
            setRecipeItems([]);
        }
    }, [editRecipeId, stocks]);

    const handleAddItem = () => {
        setRecipeItems([...recipeItems, { key: Date.now(), hammaddeId: null, miktar: 1, birim: 'Adet', birimFiyat: 0, hedefUrunAdedi: 1, maliyet: 0 }]);
    };

    const handleRemoveItem = (key) => {
        setRecipeItems(recipeItems.filter(item => item.key !== key));
    };

    const handleItemChange = (key, field, value) => {
        // ... (Logic same as before)
        const newItems = recipeItems.map(item => {
            if (item.key === key) {
                const updatedItem = { ...item, [field]: value };

                if (field === 'hammaddeId') {
                    const stock = stocks.find(s => s.StokID === value);
                    if (stock) {
                        updatedItem.birimFiyat = stock.SonAlisFiyati || 0;
                        updatedItem.birim = stock.AnaBirim || 'Adet';
                    }
                }

                const qty = updatedItem.miktar || 0;
                const divisor = updatedItem.hedefUrunAdedi || 1;
                updatedItem.maliyet = (qty / divisor) * (updatedItem.birimFiyat || 0);
                return updatedItem;
            }
            return item;
        });
        setRecipeItems(newItems);
    };

    const calculateTotalCost = () => {
        return recipeItems.reduce((acc, item) => acc + (item.maliyet || 0), 0);
    };

    const handleSave = async () => {
        // ... (Logic same as before)
        if (!selectedProduct) {
            message.warning('Lütfen üretilecek ürünü seçiniz.');
            return;
        }
        if (recipeItems.length === 0) {
            message.warning('Lütfen en az bir hammadde ekleyiniz.');
            return;
        }

        const payload = {
            urunId: selectedProduct,
            aciklama: recipeDescription,
            musteriId: selectedCustomer,
            items: recipeItems.map(i => ({
                hammaddeId: i.hammaddeId,
                miktar: i.miktar,
                birim: i.birim,
                hedefUrunAdedi: i.hedefUrunAdedi
            }))
        };

        try {
            setLoading(true);
            if (editRecipeId) {
                await api.put(`/recipes/${editRecipeId}`, payload);
                message.success('Reçete başarıyla güncellendi.');
                if (onFinish) onFinish();
            } else {
                await api.post('/recipes', payload);
                message.success('Reçete YENİ KAYIT olarak başarıyla oluşturuldu.');
                setRecipeDescription('');
                setSelectedCustomer(null);
                setRecipeItems([]);
                setSelectedCopyRecipe(null);

                if (onFinish) onFinish(); // Call to switch tab or refresh list

                // Refresh existing recipes after saving new one
                const res = await api.get('/recipes');
                setExistingRecipes(res.data);
            }
        } catch (error) {
            console.error(error);
            message.error('Kayıt başarısız.');
        } finally {
            setLoading(false);
        }
    };

    const targetProduct = stocks.find(s => s.StokID === selectedProduct);
    const targetUnit = targetProduct?.AnaBirim || 'Birim';

    const columns = [
        {
            title: 'Hammadde',
            dataIndex: 'hammaddeId',
            key: 'hammaddeId',
            render: (text, record) => (
                <Select
                    showSearch
                    style={{ width: 300 }}
                    placeholder="Hammadde Seçin"
                    optionFilterProp="children"
                    value={text}
                    onChange={(val) => handleItemChange(record.key, 'hammaddeId', val)}
                    filterOption={(input, option) =>
                        String(option.children).toLowerCase().indexOf(input.toLowerCase()) >= 0
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
            render: (text, record) => (
                <DecimalInput
                    className="ant-input"
                    value={text}
                    onChange={(e) => handleItemChange(record.key, 'miktar', parseFloat(e.target.value) || 0)}
                    style={{ width: 100 }}
                />
            )
        },
        {
            title: `Hedef Üretim (${targetUnit})`,
            dataIndex: 'hedefUrunAdedi',
            key: 'hedefUrunAdedi',
            render: (text, record) => (
                <DecimalInput
                    className="ant-input"
                    value={text}
                    onChange={(e) => handleItemChange(record.key, 'hedefUrunAdedi', parseFloat(e.target.value) || 1)}
                    style={{ width: 120 }}
                />
            )
        },
        {
            title: 'Birim',
            dataIndex: 'birim',
            key: 'birim',
            render: (text) => <Text>{text}</Text>
        },
        {
            title: 'Birim Fiyat',
            dataIndex: 'birimFiyat',
            key: 'birimFiyat',
            render: (val) => <Text>{val ? `₺${val.toFixed(2)}` : '-'}</Text>
        },
        {
            title: 'Birim Maliyet',
            dataIndex: 'maliyet',
            key: 'maliyet',
            render: (val) => <Text strong>₺{val ? val.toFixed(2) : '0.00'}</Text>
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
            <Title level={2}>Reçete Tanımlama</Title>

            <Card style={{ marginBottom: 20 }}>
                <Form layout="vertical">
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item label="Üretilecek Ürün (Bitmiş Ürün)">
                                <Select
                                    showSearch
                                    placeholder="Ürün Seçin"
                                    optionFilterProp="children"
                                    value={selectedProduct}
                                    onChange={setSelectedProduct}
                                    filterOption={(input, option) =>
                                        String(option.children).toLowerCase().indexOf(input.toLowerCase()) >= 0
                                    }
                                >
                                    {stocks.map(s => (
                                        <Option key={s.StokID} value={s.StokID}>{s.StokAdi} ({s.StokKodu})</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Mevcut Reçeteden Kopyala (Opsiyonel)">
                                <Select
                                    showSearch
                                    placeholder={loadingRecipes ? "Yükleniyor..." : (existingRecipes.length > 0 ? "Kopyalanacak Reçeteyi Seçin" : "Kayıtlı Reçete Yok")}
                                    value={selectedCopyRecipe}
                                    onChange={handleCopyRecipe}
                                    disabled={!selectedProduct || loadingRecipes}
                                    allowClear
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        String(option.children).toLowerCase().indexOf(input.toLowerCase()) >= 0
                                    }
                                >
                                    {existingRecipes.map(r => (
                                        <Option key={r.ReceteID} value={r.ReceteID}>
                                            {r.UrunAdi ? `${r.UrunAdi} - ` : ''}{r.Aciklama || `Reçete #${r.ReceteID}`} {r.MusteriUnvan ? `(Müşteri: ${r.MusteriUnvan})` : ''}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Özel Müşteri Reçetesi (Opsiyonel)">
                                <Select
                                    showSearch
                                    placeholder="Tüm Müşteriler (Genel Reçete)"
                                    optionFilterProp="children"
                                    value={selectedCustomer}
                                    onChange={setSelectedCustomer}
                                    allowClear
                                    filterOption={(input, option) =>
                                        String(option.children).toLowerCase().indexOf(input.toLowerCase()) >= 0
                                    }
                                >
                                    {customers.map(c => (
                                        <Option key={c.MusteriID} value={c.MusteriID}>{c.Unvan}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Yeni Reçete Açıklaması">
                                <Input
                                    value={recipeDescription}
                                    onChange={(e) => setRecipeDescription(e.target.value)}
                                    placeholder="Örn: Müşteri A Özel Karışım"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>

            <Card title="Hammadde Listesi" extra={<Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem}>Hammadde Ekle</Button>}>
                <Table
                    dataSource={recipeItems}
                    columns={columns}
                    pagination={false}
                    rowKey="key"
                    summary={pageData => {
                        return (
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={4} align="right">
                                    <Text strong>1 {targetUnit} İçin Tahmini Maliyet:</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1}>
                                    <Text type="success" strong style={{ fontSize: 16 }}>
                                        ₺{calculateTotalCost().toFixed(2)}
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={2} />
                            </Table.Summary.Row>
                        );
                    }}
                />
            </Card>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
                <Space>
                    <Button
                        size="large"
                        onClick={() => {
                            setRecipeItems([]);
                            setRecipeDescription('');
                            setSelectedCustomer(null);
                            setSelectedCopyRecipe(null);
                            if (editRecipeId && onFinish) onFinish(false); // cancel edit
                        }}
                    >
                        {editRecipeId ? 'İptal Et' : 'Temizle'}
                    </Button>
                    <Button type="primary" size="large" icon={<SaveOutlined />} onClick={handleSave} loading={loading}>
                        {editRecipeId ? 'Reçeteyi Güncelle' : (selectedCopyRecipe ? 'Yeni Olarak Kaydet' : 'Reçeteyi Kaydet')}
                    </Button>
                </Space>
            </div>
        </div>
    );
};

export default RecipeDefinition;
