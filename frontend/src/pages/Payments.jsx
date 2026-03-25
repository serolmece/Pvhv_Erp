import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, Button, Modal, Form, Input, Select, DatePicker, InputNumber, Switch, Table, message, Tag, Popconfirm, Radio, Space } from 'antd';
import { PlusCircleOutlined, CheckCircleOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import api from '../api/axios';
import dayjs from 'dayjs';
import DecimalInput from '../components/DecimalInput';

// Setup localizer
moment.locale('tr');
const localizer = momentLocalizer(moment);

const Payments = () => {
    const { refreshTrigger } = useOutletContext();
    const [payments, setPayments] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [otherAccounts, setOtherAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [isPeriodic, setIsPeriodic] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterEntity, setFilterEntity] = useState(null);

    // Calendar events and state
    const [events, setEvents] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');

    useEffect(() => {
        fetchPayments();
        fetchEntities();
    }, [refreshTrigger]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/payments');
            const data = res.data;
            setPayments(data);

            // Format for react-big-calendar
            const eventData = data.map(p => ({
                id: p.OdemeID,
                title: `${p.CariAdi || 'Bilinmiyor'} - ${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p.Tutar || 0)} ${p.DovizTipi} (${p.Konu || 'Ödeme'})`,
                start: new Date(p.VadeTarihi),
                end: new Date(p.VadeTarihi),
                allDay: true,
                resource: p // Custom prop to hold all data
            }));
            setEvents(eventData);
        } catch (error) {
            message.error('Ödemeler yüklenemedi.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEntities = async () => {
        try {
            // Fetch customers
            const custRes = await api.get('/customers');
            setCustomers(custRes.data);

            // Fetch suppliers
            const supRes = await api.get('/suppliers');
            setSuppliers(supRes.data);

            // Fetch other accounts
            const otherAccRes = await api.get('/other-accounts');
            setOtherAccounts(otherAccRes.data);
        } catch (error) {
            console.error("Entity fetch error:", error);
        }
    };

    const handleAddPayment = () => {
        form.resetFields();
        setEditingPayment(null);
        setIsPeriodic(false);
        setIsModalVisible(true);
    };

    const handleEditPayment = (record) => {
        setEditingPayment(record);
        setIsPeriodic(false);
        form.setFieldsValue({
            entity: `${record.CariTipi}-${record.CariID}`,
            cariId: record.CariID,
            cariTipi: record.CariTipi,
            tutar: record.Tutar,
            dovizTipi: record.DovizTipi,
            konu: record.Konu,
            vadeTarihi: dayjs(record.VadeTarihi)
        });
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingPayment(null);
    };

    const handleSubmit = async (values) => {
        try {
            setLoading(true);

            const payload = {
                cariId: values.cariId,
                cariTipi: values.cariTipi,
                tutar: values.tutar,
                dovizTipi: values.dovizTipi || 'TL',
                konu: values.konu,
            };

            if (editingPayment) {
                payload.vadeTarihi = values.vadeTarihi.format('YYYY-MM-DD');
                await api.post(`/payments/${editingPayment.OdemeID}/update`, payload);
                message.success('Ödeme güncellendi.');
            } else if (isPeriodic) {
                payload.baslangicTarihi = values.baslangicTarihi.format('YYYY-MM-DD');
                payload.tekrarGunu = values.tekrarGunu;
                payload.tekrarSayisi = values.tekrarSayisi;
                await api.post('/payments/periodic', payload);
                message.success('Periyodik ödemeler başarıyla oluşturuldu.');
            } else {
                payload.vadeTarihi = values.vadeTarihi.format('YYYY-MM-DD');
                await api.post('/payments/single', payload);
                message.success('Ödeme eklendi.');
            }

            setIsModalVisible(false);
            setEditingPayment(null);
            form.resetFields();
            fetchPayments();
        } catch (error) {
            console.error(error);
            message.error('Kayıt sırasında hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsPaid = async (id) => {
        try {
            await api.post(`/payments/${id}/pay`);
            message.success('Ödeme tamamlandı ve bakiyeye yansıtıldı.');
            fetchPayments();
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.message || 'İşlem başarısız.');
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.post(`/payments/${id}/delete`);
            message.success('Ödeme silindi.');
            fetchPayments();
        } catch (error) {
            message.error(error.response?.data?.message || 'Silme işlemi başarısız.');
        }
    };

    const eventStyleGetter = (event, start, end, isSelected) => {
        const isPaid = event.resource.OdendiMi;
        let style = {
            backgroundColor: isPaid ? '#52c41a' : '#ff4d4f',
            borderRadius: '5px',
            opacity: 0.8,
            color: 'white',
            border: '0px',
            display: 'block'
        };
        return { style };
    };

    const onSelectEvent = (event) => {
        const p = event.resource;
        Modal.info({
            title: 'Ödeme Detayı',
            content: (
                <div>
                    <p><strong>Cari:</strong> {p.CariAdi} ({p.CariTipi})</p>
                    <p><strong>Tutar:</strong> {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p.Tutar || 0)} {p.DovizTipi}</p>
                    <p><strong>Konu:</strong> {p.Konu}</p>
                    <p><strong>Vade:</strong> {moment(p.VadeTarihi).format('DD.MM.YYYY')}</p>
                    <p><strong>Durum:</strong> {p.OdendiMi ? <span style={{ color: 'green' }}>Ödendi</span> : <span style={{ color: 'red' }}>Ödenmedi</span>}</p>
                </div>
            ),
            onOk() { },
        });
    };

    const columns = [
        { title: 'Vade Tarihi', dataIndex: 'VadeTarihi', key: 'VadeTarihi', render: (text) => moment(text).format('DD.MM.YYYY'), sorter: (a, b) => new Date(a.VadeTarihi) - new Date(b.VadeTarihi) },
        { title: 'Cari', dataIndex: 'CariAdi', key: 'CariAdi' },
        { title: 'Tutar', dataIndex: 'Tutar', key: 'Tutar', render: (text, record) => `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(text || 0)} ${record.DovizTipi}` },
        { title: 'Konu', dataIndex: 'Konu', key: 'Konu' },
        { title: 'Durum', dataIndex: 'OdendiMi', key: 'OdendiMi', render: (val) => val ? <Tag color="green">Ödendi</Tag> : <Tag color="red">Bekliyor</Tag> },
        {
            title: 'İşlemler',
            key: 'action',
            render: (text, record) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    {!record.OdendiMi && (
                        <>
                            <Button
                                type="primary"
                                size="small"
                                icon={<CheckCircleOutlined />}
                                onClick={() => handleMarkAsPaid(record.OdemeID)}
                                title="Ödendi İşaretle"
                            />
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEditPayment(record)}
                                title="Değiştir"
                            />
                            <Popconfirm
                                title="Ödemeyi Sil"
                                description="Bu ödemeyi silmek istediğinize emin misiniz?"
                                onConfirm={() => handleDelete(record.OdemeID)}
                                okText="Evet"
                                cancelText="Hayır"
                            >
                                <Button
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    title="Sil"
                                />
                            </Popconfirm>
                        </>
                    )}
                </div>
            )
        }
    ];

    // Options for Select
    const entityOptions = [
        {
            label: 'Müşteriler',
            options: customers.map(c => ({ label: c.Unvan, value: `Musteri-${c.MusteriID}` }))
        },
        {
            label: 'Tedarikçiler',
            options: suppliers.map(s => ({ label: s.TedarikciAdi, value: `Tedarikci-${s.TedarikciID}` }))
        },
        {
            label: 'Diğer Cariler',
            options: otherAccounts.map(o => ({ label: o.Unvan, value: `Diger-${o.CariID}` }))
        }
    ];

    const uniqueEntities = [...new Set(payments.map(p => p.CariAdi))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));

    const filteredPayments = payments.filter(payment => {
        let statusMatch = true;
        if (filterStatus === 'completed') statusMatch = payment.OdendiMi === true || payment.OdendiMi === 1;
        if (filterStatus === 'pending') statusMatch = payment.OdendiMi === false || payment.OdendiMi === 0 || payment.OdendiMi === null;

        let entityMatch = true;
        if (filterEntity) entityMatch = payment.CariAdi === filterEntity;

        return statusMatch && entityMatch;
    });

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Ödemeler & Takvim</h1>
                <Button type="primary" icon={<PlusCircleOutlined />} onClick={handleAddPayment}>
                    Yeni Ödeme Ekle
                </Button>
            </div>

            <Card style={{ marginBottom: '24px' }}>
                <div style={{ height: 500 }}>
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        eventPropGetter={eventStyleGetter}
                        onSelectEvent={onSelectEvent}
                        date={currentDate}
                        onNavigate={(newDate) => setCurrentDate(newDate)}
                        view={currentView}
                        onView={(newView) => setCurrentView(newView)}
                        messages={{
                            next: "İleri",
                            previous: "Geri",
                            today: "Bugün",
                            month: "Ay",
                            week: "Hafta",
                            day: "Gün"
                        }}
                        views={['month', 'week', 'day']}
                    />
                </div>
            </Card>

            <Card
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Ödeme Listesi</span>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Cari İsmine Göre Filtrele..."
                                style={{ width: 250 }}
                                value={filterEntity}
                                onChange={setFilterEntity}
                                options={uniqueEntities.map(name => ({ label: name, value: name }))}
                                filterOption={(input, option) => (option?.label ?? '').toLocaleLowerCase('tr').includes(input.toLocaleLowerCase('tr'))}
                            />
                            <Radio.Group value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <Radio.Button value="all">Tümü</Radio.Button>
                                <Radio.Button value="pending">Bekleyenler</Radio.Button>
                                <Radio.Button value="completed">Tamamlananlar</Radio.Button>
                            </Radio.Group>
                        </div>
                    </div>
                }
            >
                <Table
                    columns={columns}
                    dataSource={filteredPayments}
                    rowKey="OdemeID"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={editingPayment ? "Ödeme Değiştir" : (isPeriodic ? "Periyodik Ödeme Ekle" : "Yeni Ödeme Ekle")}
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                destroyOnClose
            >
                {!editingPayment && (
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <span style={{ marginRight: '8px' }}>Periyodik Ödeme mi?</span>
                        <Switch checked={isPeriodic} onChange={setIsPeriodic} />
                    </div>
                )}

                <Form form={form} layout="vertical" onFinish={handleSubmit}>

                    <Form.Item name="entity" label="Cari Seçimi" rules={[{ required: true, message: 'Lütfen seçiniz!' }]}>
                        <Select
                            options={entityOptions}
                            placeholder="Müşteri veya Tedarikçi Seç"
                            showSearch
                            optionFilterProp="label"
                            filterOption={(input, option) => {
                                const label = option?.label ?? '';
                                return label.toLocaleLowerCase('tr').includes(input.toLocaleLowerCase('tr'));
                            }}
                            onChange={(_, opt) => {
                                if (!opt) return;
                                // Extract info from composite value like 'Musteri-12'
                                const [type, id] = opt.value.split('-');
                                form.setFieldsValue({ cariTipi: type, cariId: parseInt(id) });
                            }}
                        />
                    </Form.Item>

                    <Form.Item name="cariTipi" hidden><Input /></Form.Item>
                    <Form.Item name="cariId" hidden><Input /></Form.Item>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Form.Item name="tutar" label="Tutar" rules={[{ required: true }]} style={{ flex: 1 }}>
                            <DecimalInput className="ant-input" style={{ width: '100%', border: '1px solid #d9d9d9', borderRadius: '6px', padding: '4px 11px', outline: 'none', transition: 'all 0.2s' }} />
                        </Form.Item>

                        <Form.Item name="dovizTipi" label="Döviz" initialValue="TL" style={{ width: '100px' }}>
                            <Select>
                                <Select.Option value="TL">TL</Select.Option>
                                <Select.Option value="USD">USD</Select.Option>
                                <Select.Option value="EUR">EUR</Select.Option>
                            </Select>
                        </Form.Item>
                    </div>

                    <Form.Item name="konu" label="Konu (Açıklama)" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    {!isPeriodic ? (
                        <Form.Item name="vadeTarihi" label="Vade Tarihi" rules={[{ required: true }]}>
                            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
                        </Form.Item>
                    ) : (
                        <>
                            <Form.Item name="baslangicTarihi" label="Başlangıç Tarihi" rules={[{ required: true }]}>
                                <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
                            </Form.Item>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                <Form.Item name="tekrarGunu" label="Tekrar Günü (Ayın kaçı)" rules={[{ required: true }]} style={{ flex: 1 }}>
                                    <InputNumber style={{ width: '100%' }} min={1} max={31} />
                                </Form.Item>

                                <Form.Item name="tekrarSayisi" label="Kere (Ay)" rules={[{ required: true }]} style={{ flex: 1 }}>
                                    <InputNumber style={{ width: '100%' }} min={1} max={120} />
                                </Form.Item>
                            </div>
                        </>
                    )}

                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Button onClick={handleCancel} style={{ marginRight: '8px' }}>İptal</Button>
                        <Button type="primary" htmlType="submit" loading={loading}>Kaydet</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Payments;
