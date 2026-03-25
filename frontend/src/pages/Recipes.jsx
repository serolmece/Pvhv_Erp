import React, { useState, useEffect } from 'react';
import { Tabs, Table, Card, Typography, Button, Space, Modal, message } from 'antd';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../api/axios';
import RecipeDefinition from '../components/RecipeDefinition';

const { Title, Text } = Typography;

const Recipes = () => {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('list');
    const [editRecipeId, setEditRecipeId] = useState(null);

    const [detailsVisible, setDetailsVisible] = useState(false);
    const [currentDetails, setCurrentDetails] = useState([]);
    const [detailsLoading, setDetailsLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'list') {
            fetchRecipes();
        }
    }, [activeTab]);

    const fetchRecipes = async () => {
        try {
            setLoading(true);
            const res = await api.get('/recipes');
            setRecipes(res.data);
        } catch (error) {
            console.error(error);
            message.error('Reçeteler Listesi yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (recipeId) => {
        try {
            setDetailsLoading(true);
            const res = await api.get(`/recipes/${recipeId}`);
            // Format details to get stock info if possible, but backend mostly returns IDs right now.
            // Assuming backend returns items with HammaddeID, Miktar, Birim. We don't have stock names populated from getRecipeDetails yet natively, 
            // but let's just show what we have or adapt it.
            setCurrentDetails(res.data.items);
            setDetailsVisible(true);
        } catch (error) {
            console.error(error);
            message.error('Detaylar alınamadı.');
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleDeleteRecipe = async (recipeId) => {
        Modal.confirm({
            title: 'Emin misiniz?',
            content: 'Bu reçeteyi silmek istediğinize emin misiniz? (Önceden verilen siparişleri etkilemez)',
            okText: 'Evet, Sil',
            okType: 'danger',
            cancelText: 'Vazgeç',
            onOk: async () => {
                try {
                    await api.delete(`/recipes/${recipeId}`);
                    message.success('Reçete başarıyla silindi.');
                    fetchRecipes();
                } catch (error) {
                    console.error(error);
                    message.error('Silinirken hata oluştu.');
                }
            }
        });
    };

    const handleEditClick = (recipeId) => {
        setEditRecipeId(recipeId);
        setActiveTab('new');
    };

    const columns = [
        { title: 'Kayıt No', dataIndex: 'ReceteID', key: 'id', width: 100, render: val => <Text strong>#{val}</Text> },
        { title: 'Ürün Adı', dataIndex: 'UrunAdi', key: 'urun', render: (val, record) => <><Text strong>{val}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{record.UrunKodu}</Text></> },
        { title: 'Özel Müşteri', dataIndex: 'MusteriUnvan', key: 'musteri', render: val => val ? <Text type="success">{val}</Text> : <Text type="secondary">Genel Formül</Text> },
        { title: 'Açıklama', dataIndex: 'Aciklama', key: 'aciklama' },
        { title: 'Kayıt Tarihi', dataIndex: 'OlusturmaTarihi', key: 'tarih', render: val => new Date(val).toLocaleDateString('tr-TR') },
        {
            title: 'İşlemler',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        type="default"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetails(record.ReceteID)}
                    >
                        İçeriği Gör
                    </Button>
                    <Button
                        type="link"
                        onClick={() => handleEditClick(record.ReceteID)}
                    >
                        Düzenle
                    </Button>
                    <Button
                        type="link"
                        danger
                        onClick={() => handleDeleteRecipe(record.ReceteID)}
                    >
                        Sil
                    </Button>
                </Space>
            )
        }
    ];

    const detailColumns = [
        {
            title: 'Hammadde Adı',
            dataIndex: 'HammaddeAdi',
            key: 'HammaddeAdi',
            render: (text, record) => (
                <>
                    <Text strong>{text || 'Bilinmeyen Hammadde'}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>Kodu: {record.HammaddeKodu || '-'} (ID: {record.HammaddeID})</Text>
                </>
            )
        },
        { title: 'Miktar', dataIndex: 'Miktar', key: 'Miktar' },
        { title: 'Kaç Ürün İçin?', dataIndex: 'HedefUrunAdedi', key: 'HedefUrunAdedi', render: val => <Text strong>{val || 1}</Text> },
        { title: 'Birim', dataIndex: 'Birim', key: 'Birim' }
    ];

    const items = [
        {
            key: 'list',
            label: 'Kayıtlı Reçeteler',
            children: (
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Title level={4} style={{ margin: 0 }}>Sistemdeki Tüm Reçeteler</Title>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setActiveTab('new')}>Yeni Reçete Ekle</Button>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={recipes}
                        rowKey="ReceteID"
                        loading={loading}
                        pagination={{ pageSize: 10 }}
                    />
                </Card>
            )
        },
        {
            key: 'new',
            label: editRecipeId ? 'Reçeteyi Düzenle' : 'Yeni Reçete Ekle',
            children: <RecipeDefinition
                editRecipeId={editRecipeId}
                onFinish={() => {
                    setEditRecipeId(null);
                    setActiveTab('list');
                    fetchRecipes();
                }}
            />
        }
    ];

    return (
        <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
            <Title level={2}>Reçeteler ve Üretim Şablonları</Title>
            <Tabs
                activeKey={activeTab}
                onChange={(key) => {
                    if (key === 'list') {
                        setEditRecipeId(null);
                    }
                    setActiveTab(key);
                }}
                items={items}
                type="card"
                size="large"
            />

            <Modal
                title="Reçete İçeriği (Hammaddeler)"
                open={detailsVisible}
                onCancel={() => setDetailsVisible(false)}
                footer={[<Button key="close" onClick={() => setDetailsVisible(false)}>Kapat</Button>]}
            >
                <Table
                    columns={detailColumns}
                    dataSource={currentDetails}
                    rowKey="HammaddeID"
                    loading={detailsLoading}
                    pagination={false}
                />
            </Modal>
        </div>
    );
};

export default Recipes;
