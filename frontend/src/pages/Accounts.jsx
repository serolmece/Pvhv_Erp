import React from 'react';
import { Tabs } from 'antd';
import { UserCheck, Users, Briefcase } from 'lucide-react';
import Customers from './Customers';
import Suppliers from './Suppliers';
import OtherAccounts from './OtherAccounts';

const Accounts = () => {
    const items = [
        {
            key: '1',
            label: (
                <span className="flex items-center space-x-2">
                    <UserCheck size={18} />
                    <span>Müşteri Kartları</span>
                </span>
            ),
            children: <div className="-mt-8"><Customers isEmbedded={true} /></div>,
        },
        {
            key: '2',
            label: (
                <span className="flex items-center space-x-2">
                    <Users size={18} />
                    <span>Tedarikçi Kartları</span>
                </span>
            ),
            children: <div className="-mt-8"><Suppliers isEmbedded={true} /></div>,
        },
        {
            key: '3',
            label: (
                <span className="flex items-center space-x-2">
                    <Briefcase size={18} />
                    <span>Diğer Cariler</span>
                </span>
            ),
            children: <div className="-mt-8"><OtherAccounts isEmbedded={true} /></div>,
        },
    ];

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 min-h-[calc(100vh-10rem)]">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Cari Kart Yönetimi</h2>
            <Tabs defaultActiveKey="1" items={items} />
        </div>
    );
};

export default Accounts;
