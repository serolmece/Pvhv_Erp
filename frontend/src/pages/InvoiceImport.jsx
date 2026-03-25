import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone'; // Assuming react-dropzone is installed or use native
import { Upload, FileText, CheckCircle, AlertCircle, X, Save, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import DecimalInput from '../components/DecimalInput';

const InvoiceImport = () => {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Conversion state
    const [kgLitreFactor, setKgLitreFactor] = useState(1);

    const onDrop = useCallback(acceptedFiles => {
        setFile(acceptedFiles[0]);
        setError(null);
    }, []);

    const handleFileUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('invoiceFile', file);

        setLoading(true);
        try {
            const res = await api.post('/import/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setParsedData(res.data);
        } catch (err) {
            console.error(err);
            setError('Import başarısız: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!parsedData) return;

        try {
            setLoading(true);
            // Construct payload
            const payload = {
                supplier: {
                    name: parsedData.supplier.name,
                    taxID: parsedData.supplier.taxID,
                    iban: parsedData.supplier.iban,
                    address: parsedData.supplier.address,
                    existingID: parsedData.dbSupplier?.TedarikciID,
                    updateIBAN: parsedData.ibanAlert
                },
                items: parsedData.items.map(item => ({
                    ...item,
                    conversionFactor: item.unit !== item.matchedStock?.AnaBirim ? kgLitreFactor : 1,
                    createNewStock: item.status === 'new'
                })),
                invoiceDate: new Date(), // Should parse from invoice actually
                currencyRate: parsedData.totals?.exchangeRate || 1
            };

            await api.post('/import/save', payload);
            alert('Fatura başarıyla kaydedildi!');
            setParsedData(null);
            setFile(null);
        } catch (err) {
            alert('Kayıt hatası: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num) => {
        if (typeof num !== 'number') return num;
        return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Akıllı Fatura Aktarımı</h1>
                    <p className="text-gray-500 mt-1">PDF veya XML faturaları otomatik işleyin</p>
                </div>
            </div>

            {/* Upload Section */}
            {!parsedData && (
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-indigo-500 transition-colors cursor-pointer"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        setFile(e.dataTransfer.files[0]);
                    }}
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
                            <Upload size={32} />
                        </div>
                        <div>
                            <p className="text-lg font-medium text-gray-700">Dosyayı buraya sürükleyin veya seçin</p>
                            <p className="text-sm text-gray-400 mt-1">Desteklenen formatlar: .xml (UBL-TR), .pdf</p>
                        </div>

                        <input
                            type="file"
                            accept=".xml,.pdf"
                            className="hidden"
                            id="file-upload"
                            onChange={(e) => setFile(e.target.files[0])}
                        />
                        <label htmlFor="file-upload" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer">
                            Dosya Seç
                        </label>

                        {file && (
                            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                                <FileText size={18} />
                                {file.name}
                            </div>
                        )}

                        {file && (
                            <button
                                onClick={handleFileUpload}
                                disabled={loading}
                                className="mt-2 px-8 py-3 bg-gray-900 text-white rounded-xl shadow-lg hover:scale-105 transition-transform"
                            >
                                {loading ? 'İnceleniyor...' : 'Faturayı Çözümle'}
                            </button>
                        )}

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Review Section */}
            {parsedData && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Header Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <CheckCircle className={parsedData.dbSupplier ? "text-green-500" : "text-yellow-500"} size={20} />
                                Tedarikçi
                            </h3>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">Ünvan:</span> <span className="font-semibold">{parsedData.supplier.name}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">VKN:</span> <span>{parsedData.supplier.taxID}</span></div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Fatura Özeti</h3>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">No:</span> <span className="font-semibold">{parsedData.invoiceDetails.invoiceNo}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Tarih:</span> <span>{parsedData.invoiceDetails.invoiceDate}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Para Birimi:</span> <span>{parsedData.totals.currency}</span></div>
                                {parsedData.totals.currency !== 'TRY' && (
                                    <div className="flex justify-between"><span className="text-gray-500">Kur:</span> <span className="font-mono bg-yellow-100 px-1 rounded">{formatNumber(parsedData.totals.exchangeRate)}</span></div>
                                )}
                            </div>
                        </div>

                        <div className={`p-6 rounded-2xl shadow-sm border ${parsedData.globalValidation?.isGlobalMatch ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <h3 className={`text-lg font-bold mb-4 ${parsedData.globalValidation?.isGlobalMatch ? 'text-green-700' : 'text-red-700'}`}>
                                {parsedData.globalValidation?.isGlobalMatch ? 'Tutar Doğrulandı' : 'Tutar Uyuşmazlığı'}
                            </h3>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="opacity-70">Kalem Toplamı:</span>
                                    <span className="font-bold">{formatNumber(parseFloat(parsedData.globalValidation?.sumLineTotal))} {parsedData.totals.currency}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="opacity-70">Fatura Tutarı:</span>
                                    <span className="font-bold">{formatNumber(parsedData.totals.totalAmount)} {parsedData.totals.currency}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Fatura Kalemleri</h3>
                            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
                                <span className="text-sm font-medium text-blue-700">KG/Litre Çeviri:</span>
                                <DecimalInput
                                    value={kgLitreFactor}
                                    onChange={(e) => setKgLitreFactor(e.target.value)}
                                    className="w-16 p-1 border rounded text-center text-sm"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                                    <tr>
                                        <th className="p-3">Stok Kodu</th>
                                        <th className="p-3">Ürün Adı</th>
                                        <th className="p-3 text-right">Miktar</th>
                                        <th className="p-3">Birim</th>
                                        <th className="p-3 text-right">Birim Fiyat</th>
                                        <th className="p-3 text-center">Döviz</th>
                                        <th className="p-3 text-center">KDV %</th>
                                        <th className="p-3 text-right">Satır Toplamı (Net)</th>
                                        {parsedData.totals.currency !== 'TRY' && <th className="p-3 text-right bg-yellow-50">TL Karşılığı</th>}
                                        <th className="p-3">Eşleşme</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {parsedData.items.map((item, idx) => (
                                        <tr key={idx} className={`hover:bg-gray-50 ${item.validation?.isTotalMismatch ? 'bg-red-50' : ''}`}>
                                            <td className="p-3 font-mono text-gray-600 text-xs">{item.stockCode || '-'}</td>
                                            <td className="p-3 font-medium text-gray-800 max-w-xs truncate" title={item.name}>
                                                {item.name}
                                                {item.validation?.isTotalMismatch && (
                                                    <div className="text-xs text-red-500 mt-1">⚠️ Hesap Hatası</div>
                                                )}
                                            </td>
                                            <td className="p-3 text-right font-mono">{formatNumber(item.quantity)}</td>
                                            <td className="p-3 text-gray-500">{item.unit}</td>
                                            <td className="p-3 text-right font-mono">{formatNumber(item.price)}</td>
                                            <td className="p-3 text-center font-bold text-gray-400">{item.currency}</td>
                                            <td className="p-3 text-center text-gray-500">%{item.taxRate}</td>
                                            <td className="p-3 text-right font-bold text-gray-900">{formatNumber(item.total)}</td>

                                            {parsedData.totals.currency !== 'TRY' && (
                                                <td className="p-3 text-right font-mono text-gray-800 bg-yellow-50 font-bold">
                                                    {formatNumber(parseFloat(item.calculatedTLTotal))} ₺
                                                </td>
                                            )}

                                            <td className="p-3">
                                                {item.matchedStock ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-indigo-700">{item.matchedStock.StokKodu}</span>
                                                        <span className="text-[10px] text-gray-400 truncate w-32">{item.matchedStock.StokAdi}</span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">Yeni Kart</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4 pb-10">
                        <button
                            onClick={() => { setParsedData(null); setFile(null); }}
                            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition"
                        >
                            İptal Et
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || (parsedData.globalValidation && !parsedData.globalValidation.isGlobalMatch)}
                            className={`px-8 py-3 text-white rounded-xl shadow-lg font-bold flex items-center gap-2 transition-transform transform active:scale-95 ${(parsedData.globalValidation && !parsedData.globalValidation.isGlobalMatch)
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                                }`}
                            title={parsedData.globalValidation?.isGlobalMatch ? '' : 'Genel Toplam Uyuşmazlığı Var, Kaydedilemez'}
                        >
                            <Save size={20} />
                            {loading ? 'Kaydediliyor...' : 'Onayla ve Kaydet'}
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};

export default InvoiceImport;
