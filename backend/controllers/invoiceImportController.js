const { poolPromise, sql } = require('../database/db');
const xml2js = require('xml2js');
const pdf = require('pdf-parse');
const fs = require('fs');

const getSimilarity = (s1, s2) => {
    if (!s1 || !s2) return 0;
    const clean1 = s1.toLowerCase().replace(/[^\w\dğüşıöç]/g, '');
    const clean2 = s2.toLowerCase().replace(/[^\w\dğüşıöç]/g, '');
    if (clean1 === clean2) return 1;
    if (clean1.length < 2 || clean2.length < 2) return 0;
    const bigrams = (str) => {
        const v = [];
        for (let i = 0; i < str.length - 1; i++) v.push(str.slice(i, i + 2));
        return v;
    };
    const b1 = bigrams(clean1);
    const b2 = bigrams(clean2);
    let intersection = 0;
    const b2copy = [...b2];
    for (let i = 0; i < b1.length; i++) {
        const index = b2copy.indexOf(b1[i]);
        if (index !== -1) {
            intersection++;
            b2copy.splice(index, 1);
        }
    }
    return (2.0 * intersection) / (b1.length + b2.length);
};

const normalizeTaxID = (id) => id ? id.replace(/\D/g, '') : '';

exports.processInvoice = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Dosya yüklenmedi.' });
    const { mimetype, path: filePath, originalname } = req.file;

    try {
        let parsedData = {};
        if (mimetype.includes('xml') || originalname.endsWith('.xml')) {
            parsedData = await parseXML(filePath);
        } else if (mimetype.includes('pdf') || originalname.endsWith('.pdf')) {
            parsedData = await parsePDF(filePath);
        } else {
            return res.status(400).json({ message: 'Desteklenmeyen dosya formatı. Sadece XML ve PDF.' });
        }
        fs.unlinkSync(filePath);
        const enrichedData = await enrichInvoiceData(parsedData);
        res.json(enrichedData);
    } catch (err) {
        console.error('Invoice processing error:', err);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ message: 'Fatura işlenirken hata oluştu: ' + err.message });
    }
};

const parseXML = async (filePath) => {
    try {
        const xmlContent = await fs.promises.readFile(filePath, 'utf8');
        // stripPrefix: true handles namespaced XML (cac:Invoice -> Invoice)
        // ignoreAttrs: true simplifies value extraction
        const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true, stripPrefix: true });
        const result = await parser.parseStringPromise(xmlContent);

        // UBL root is usually Invoice, but check result structure
        // If namespaces are stripped, keys don't have prefixes.
        // It might be nested under 'Invoice' if root element is Invoice
        let invoice = result.Invoice || result;

        // Helper to safely access nested properties even if intermediate is undefined or array
        const get = (obj, path) => {
            return path.split('.').reduce((acc, part) => {
                if (!acc) return undefined;
                // If acc is array, we might want the first element? 
                // UBL often has arrays for simple fields if repeated.
                // But for path traversal, let's assume object structure unless explicit.
                return acc[part];
            }, obj);
        };

        // --- Supplier Info ---
        const supplierParty = get(invoice, 'AccountingSupplierParty.Party');
        const partyName = get(supplierParty, 'PartyName.Name');
        const person = get(supplierParty, 'Person');
        const supplierName = partyName || (person ? (get(person, 'FirstName') + ' ' + get(person, 'FamilyName')) : 'Bilinmeyen Tedarikçi');

        const taxScheme = get(supplierParty, 'PartyTaxScheme');
        const taxIDObj = Array.isArray(taxScheme) ? taxScheme[0] : taxScheme;
        const taxID = get(taxIDObj, 'CompanyID') || '';

        const address = get(supplierParty, 'PostalAddress') || {};
        const fullAddress = [
            address.StreetName,
            address.BuildingNumber,
            address.CitySubdivisionName,
            address.CityName,
            get(address, 'Country.Name')
        ].filter(Boolean).join(' ');

        // --- Items ---
        let lines = get(invoice, 'InvoiceLine');
        if (!lines) lines = [];
        if (!Array.isArray(lines)) lines = [lines];

        const docCurrency = invoice.DocumentCurrencyCode || 'TRY';

        const items = lines.map(line => {
            const item = get(line, 'Item') || {};
            const priceObj = get(line, 'Price') || {};

            // Tax: In UBL, TaxTotal can be at line level
            const taxTotal = get(line, 'TaxTotal');
            const mainTax = Array.isArray(taxTotal) ? taxTotal[0] : taxTotal;
            const taxSubtotal = get(mainTax, 'TaxSubtotal');
            const sub = Array.isArray(taxSubtotal) ? taxSubtotal[0] : taxSubtotal;
            const taxRate = parseFloat(sub?.Percent) || 0;
            const taxAmount = parseFloat(get(mainTax, 'TaxAmount')) || 0;

            const quantity = parseFloat(line.InvoicedQuantity) || 0;
            const lineTotal = parseFloat(line.LineExtensionAmount) || 0;
            const priceWrapper = parseFloat(priceObj.PriceAmount);
            // Fallback price calculation if PriceAmount is missing
            const price = priceWrapper || (quantity ? (lineTotal / quantity) : 0);

            return {
                stockCode: get(item, 'SellersItemIdentification.ID') || get(item, 'ManufacturersItemIdentification.ID') || '',
                name: get(item, 'Name') || 'Bilinmeyen Ürün',
                quantity,
                unit: 'Adet', // Attribute 'unitCode' is lost with ignoreAttrs:true. Defaulting to Adet.
                price,
                taxRate,
                taxAmount,
                total: lineTotal,
                currency: docCurrency
            };
        });

        // --- Totals ---
        const totalAmount = parseFloat(get(invoice, 'LegalMonetaryTotal.PayableAmount')) || 0;

        // --- IBAN ---
        let iban = '';
        const paymentMeans = get(invoice, 'PaymentMeans');
        if (paymentMeans) {
            const pmArray = Array.isArray(paymentMeans) ? paymentMeans : [paymentMeans];
            const account = pmArray.find(p => get(p, 'PayeeFinancialAccount.ID'));
            if (account) iban = get(account, 'PayeeFinancialAccount.ID');
        }

        return {
            supplier: { name: supplierName, taxID: normalizeTaxID(taxID), address: fullAddress, iban },
            items,
            totals: { currency: docCurrency, totalAmount, exchangeRate: 1 },
            raw: 'XML Parsed Successfully'
        };

    } catch (error) {
        console.error('XML Parse Error:', error);
        throw error; // Let main handler catch it
    }
};

const parseTurkishFloat = (str) => {
    if (!str) return 0;
    let clean = str.replace(/%/g, '');
    // Handle "1.776,20" (dot thousand, comma decimal)
    let v = clean.replace(/\./g, '');
    v = v.replace(',', '.');
    v = v.replace(/[^\d.-]/g, '');
    return parseFloat(v) || 0;
};

const parsePDF = async (filePath) => {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text;
    const lines = text.split(/\r?\n/);

    const invoiceNoRegex = /\b(KRL|YDM|SAA|GIB|FAT|EAR)\d{13}\b/g;
    const invoiceNoMatch = text.match(invoiceNoRegex);
    const invoiceNo = invoiceNoMatch ? invoiceNoMatch[0] : '';
    const dateRegex = /(\d{2}[.-]\d{2}[.-]\d{4})/;
    const dateMatch = text.match(dateRegex);
    const invoiceDate = dateMatch ? dateMatch[0] : '';

    let exchangeRate = 1;
    const footerLines = lines.slice(-25);
    const rateRegex = /(?:Kur|Döviz\s?Kuru|Exchange\s?Rate|Kur Bilgisi)[:\s]*([\d,]+)/i;
    for (const line of footerLines) {
        const match = line.match(rateRegex);
        if (match) { exchangeRate = parseTurkishFloat(match[1]); break; }
    }
    if (exchangeRate === 1) {
        const fullMatch = text.match(/(?:Kur|Döviz\s?Kuru)[:\s]*([\d,]+)/i);
        if (fullMatch) exchangeRate = parseTurkishFloat(fullMatch[1]);
    }

    let taxID = '';
    let supplierName = 'Bilinmeyen Tedarikçi';
    const allNumbers = text.match(/\b\d{10,11}\b/g) || [];
    const MY_VKN = '7330790337';
    const candidates = allNumbers.filter(num => num !== MY_VKN);
    if (candidates.length > 0) taxID = candidates[0];

    const totalAmountRegex = /(?:Odenecek|Ödenecek|Genel|Grand)\s?(?:Tutar|Toplam|Total)[:\s]*([\d.,]+)/i;
    const totalMatch = text.match(totalAmountRegex);
    const totalPayable = totalMatch ? parseTurkishFloat(totalMatch[1]) : 0;

    let docCurrency = 'TRY';
    if (text.match(/Genel\s?Topla.*?USD/i) || text.match(/Grand\s?Total.*?USD/i) || text.match(/Ödenecek.*?USD/i)) docCurrency = 'USD';
    else if (text.match(/Genel\s?Topla.*?EUR/i) || text.match(/Grand\s?Total.*?EUR/i) || text.match(/Ödenecek.*?EUR/i)) docCurrency = 'EUR';

    let items = [];
    // Strict Header Detection
    const itemStartHeaders = [
        'Sıra No', 'Sira No', 'Mal Hizmet', 'Açıklama', 'Ürün', 'Urun',
        'Product', 'Description', 'Item', 'Stok Kodu', 'Kodu', 'NO'
    ];
    const blacklistWords = [
        'Web Sitesi', 'İrsaliye Tarihi', 'Vadesi geçen', 'Gecikme zammı', 'Vade farkı', 'ETTN',
        'Mersis', 'e-Posta', 'Faks', 'Vergi Dairesi', 'Adres', 'Tel:', 'Fatura Tarihi:', 'Sipariş Tarihi:',
        'Mal Hizmet Toplam', 'Toplam İskonto', 'Hesaplanan KDV', 'Ödenecek Tutar', 'KDV Dahil'
    ];
    const summaryRegex = /^(?:Toplam|Ara Toplam|Hesaplanan|KDV|Vergiler|Ödenecek|Genel)/i;

    let isParsingItems = false;
    let headerFound = false;
    // Buffer for merged text handling
    let fullTextBuffer = lines.join(' ');

    // NEW STRATEGY: Instead of line-by-line which fails on merged nonsense like "1 IYM04001RAFİNEAYÇİÇEKYAĞI...",
    // We will scan the entire text for patterns if line-by-line fails or produces garbage.

    // However, keeping line-by-line is safer for general structure.
    // The user's example shows:
    // "1 IYM04001RAFİNEAYÇİÇEKYAĞI2.140KG83,00TRY%0,00 %0,00 %0,00 %0,00 %0,000,00TRY%1,001.776,20TRY177.620,00TRY"
    // This is a single line with NO SPACES between meaningful columns (PDF extraction artifact).
    // We need a regex that matches the STRUCTURE of the row.

    // Pattern: 
    // ^(\d+) (Row)
    // ([A-Z0-9]+) (Stock Code)
    // (.*?) (Name - might be merged)
    // ([\d.,]+) (Quantity)
    // (KG|ADET|...) (Unit)
    // ...

    // If we detect this "Compact Mess", we use a specific regex.

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        if (!headerFound) {
            if (itemStartHeaders.some(kw => line.includes(kw))) {
                headerFound = true;
                isParsingItems = true;
                continue;
            }
        }

        if (isParsingItems) {
            if (summaryRegex.test(line) || blacklistWords.some(w => line.includes(w))) {
                if (line.match(/Ödenecek\s?Tutar|Genel\s?Toplam/i)) {
                    isParsingItems = false;
                    break;
                }
                continue;
            }

            // BLACKLIST CHECK: Filter out lines like "Tel: ...", "Fatura Tarihi: ..." which are appearing as items
            if (line.match(/^(Tel:|Fatura Tarihi:|Sipariş Tarihi:)/i)) continue;

            // --- COMPACT ROW DETECTION (Merged Spaces) ---
            // Regex to pick apart "1 IYM04001RAFİNE...2.140KG..."
            // 1: Sequence (digits)
            // 2: Stock Code (Alphanumeric? or just start of string?)
            // Key anchor is UNIT (KG, ADET) and PRECEDING NUMBER (Quantity)

            const unitMatch = line.match(/(KG|K\.G|ADET|AD|LİTRE|LITRE|LT|M3|M2|MT|GR|GRAM|KP|KOLİ)/i);

            if (unitMatch) {
                const unitStr = unitMatch[0];
                const unitIndex = line.indexOf(unitStr);

                // DATA BEFORE UNIT
                const preUnitLine = line.substring(0, unitIndex); // NO trim yet, keep positions if needed

                // Extract Quantity: The number IMMEDIATELY before the Unit.
                // In "AYÇİÇEKYAĞI2.140", the number is 2.140
                const quantityMatch = preUnitLine.match(/([\d.,]+)$/);

                if (quantityMatch) {
                    const quantityStr = quantityMatch[1];
                    const quantity = parseTurkishFloat(quantityStr);

                    // DATA BEFORE QUANTITY
                    // "1 IYM04001RAFİNEAYÇİÇEKYAĞI"
                    let descPart = preUnitLine.substring(0, preUnitLine.length - quantityStr.length).trim();

                    // Extract Sequence No (Start)
                    let seqNo = '';
                    const seqMatch = descPart.match(/^(\d+)/);
                    if (seqMatch) {
                        seqNo = seqMatch[1];
                        descPart = descPart.substring(seqNo.length).trim();
                    }

                    // Now descPart is "IYM04001RAFİNEAYÇİÇEKYAĞI" OR " IYM04001 RAFİNE..."
                    // If spaces exist, standard split works.
                    // If NO spaces, we have a problem. "IYM04001RAFİNE..."
                    // Stock codes usually Uppercase Alphanumeric. Names usually distinct?
                    // "IYM04001" ends with digit? "RAFİNE" starts with letter.
                    // Heuristic: Split at transition from Digit to Letter? 
                    // "001" -> "R". 
                    // Regex: /([A-Z0-9]+?)(\D.*)/ 
                    // Note: Stock codes CAN contain letters. "IYM".
                    // But usually Code is distinct.

                    let stockCode = '';
                    let name = descPart;

                    // Try to find a split point if no spaces
                    if (!descPart.includes(' ')) {
                        // Strategy: Stock code is usually the first chunk.
                        // If it starts with IYM04001 (Letters then Digits), split after Digits.
                        // "IYM04001" "RAFİNE"
                        const splitMatch = descPart.match(/^([A-Z0-9]+?\d)([A-ZÇĞİÖŞÜ].*)$/);
                        if (splitMatch) {
                            stockCode = splitMatch[1];
                            name = splitMatch[2];
                        } else {
                            // Maybe code is purely numeric? "2020380" "AKTÜATÖR" -> "2020380AKTÜATÖR"
                            // Split after digits?
                            const numSplit = descPart.match(/^(\d+)([A-ZÇĞİÖŞÜ].*)$/);
                            if (numSplit && numSplit[1].length >= 4) {
                                stockCode = numSplit[1];
                                name = numSplit[2];
                            }
                            // What if Code is "SHKEDIA"? No digits. Valid brand?
                            // If no digits, assume it's Name (unless column exists).
                        }
                    } else {
                        // Spaces exist. Standard logic.
                        // "IYM04001 RAFİNE"
                        const parts = descPart.split(/\s+/);
                        const candidate = parts[0];
                        const hasDigit = /\d/.test(candidate);
                        // Filter "12." or line numbers?

                        // Strict Code Check
                        let isCode = false;
                        if (hasDigit) {
                            if (/^\d+$/.test(candidate)) {
                                if (candidate.length >= 4) isCode = true;
                            } else {
                                if (candidate.length >= 3) isCode = true;
                            }
                        }
                        // Special case: "SHKEDIA" in Image 1 was Brand/Name.

                        if (isCode) {
                            stockCode = candidate;
                            parts.shift();
                            name = parts.join(' ');
                        } else {
                            name = descPart;
                        }
                    }

                    // DATA AFTER UNIT
                    // "KG83,00TRY%0,00..."
                    const postUnitLine = line.substring(unitIndex + unitStr.length);
                    // Extract Price: Immediately after unit? or separated?
                    // "83,00"
                    const postNumbers = postUnitLine.match(/([\d.,]+)/g);
                    let price = 0;
                    let lineTotal = 0;
                    let taxRate = 0;
                    let taxAmount = 0;

                    if (postNumbers && postNumbers.length > 0) {
                        price = parseTurkishFloat(postNumbers[0]);
                        // Total is usually last large number
                        lineTotal = parseTurkishFloat(postNumbers[postNumbers.length - 1]);

                        // Tax Rate? "%1,00" -> match %
                        const taxMatch = postUnitLine.match(/%([\d.,]+)/);
                        if (taxMatch) taxRate = parseTurkishFloat(taxMatch[1]);

                        // Tax Amount? Usually before Line Total.
                        if (postNumbers.length >= 3) {
                            // Heuristic check
                            taxAmount = parseTurkishFloat(postNumbers[postNumbers.length - 2]);
                        }
                    }

                    // Currency catch? "TRY"
                    let itemCurrency = docCurrency;
                    if (postUnitLine.includes('USD')) itemCurrency = 'USD';
                    if (postUnitLine.includes('EUR')) itemCurrency = 'EUR';

                    items.push({
                        stockCode,
                        name: name.trim(),
                        quantity,
                        unit: unitStr,
                        price,
                        currency: itemCurrency,
                        taxRate,
                        taxAmount,
                        total: lineTotal
                    });

                }
            } else {
                // No Unit? Skip.
                // We rely on Unit anchor for this compact format.
                continue;
            }
        }
    }

    const ibanRegex = /TR\d{2}\s?(\d{4}\s?){5}\d{2}/g;
    const foundIbans = text.match(ibanRegex) || [];
    const iban = foundIbans.length > 0 ? foundIbans[0].replace(/\s/g, '') : '';

    return {
        supplier: { name: supplierName, taxID: normalizeTaxID(taxID), address: '', iban },
        items,
        invoiceDetails: { invoiceNo, invoiceDate },
        totals: { currency: docCurrency, totalAmount: totalPayable, exchangeRate },
        textDump: text.substring(0, 500)
    };
};

const enrichInvoiceData = async (parsedData) => {
    const pool = await poolPromise;
    const { supplier, items, totals } = parsedData;
    let dbSupplier = null;
    if (supplier.taxID) {
        const supRes = await pool.request().input('VergiNo', sql.NVarChar, supplier.taxID).query('SELECT * FROM Tedarikciler WHERE VergiNo = @VergiNo');
        dbSupplier = supRes.recordset[0];
    }
    if (!dbSupplier && supplier.name && supplier.name !== 'Bilinmeyen Tedarikçi') {
        const nameRes = await pool.request().input('Name', sql.NVarChar, `%${supplier.name}%`).query('SELECT TOP 1 * FROM Tedarikciler WHERE TedarikciAdi LIKE @Name');
        dbSupplier = nameRes.recordset[0];
    }
    if (dbSupplier) supplier.name = dbSupplier.TedarikciAdi;
    let ibanAlert = false;
    if (dbSupplier && supplier.iban && dbSupplier.IBAN && dbSupplier.IBAN !== supplier.iban) ibanAlert = true;
    let allStocks = [];
    try {
        const allStockRes = await pool.request().query('SELECT StokID, StokAdi, StokKodu, Barkod FROM StokKartlari');
        allStocks = allStockRes.recordset;
    } catch (e) {
        console.error(e);
    }
    const enrichedItems = await Promise.all(items.map(async (item) => {
        const rate = (item.currency === 'USD' || item.currency === 'EUR') ? totals.exchangeRate : 1;
        const calculatedTLTotal = (item.total * rate);
        let matchedStock = null;
        let bestScore = 0;
        let matchMethod = '';
        if (item.stockCode) {
            const codeMatch = allStocks.find(s => s.StokKodu === item.stockCode || s.Barkod === item.stockCode);
            if (codeMatch) { matchedStock = codeMatch; bestScore = 1; matchMethod = 'code'; }
        }
        if (!matchedStock) {
            const exactMatch = allStocks.find(s => s.StokAdi === item.name);
            if (exactMatch) { matchedStock = exactMatch; bestScore = 1; matchMethod = 'exact'; }
            else {
                for (const stock of allStocks) {
                    const score = getSimilarity(item.name, stock.StokAdi);
                    if (score > bestScore) { bestScore = score; matchedStock = stock; }
                }
                if (bestScore >= 0.8) matchMethod = 'fuzzy';
                else matchedStock = null;
            }
        }
        const expectedTotal = item.quantity * item.price;
        const diff = Math.abs(expectedTotal - item.total);
        const isTotalMismatch = diff > (item.total * 0.05);

        return {
            ...item,
            matchedStock: matchedStock || null,
            status: matchedStock ? 'matched' : 'new',
            matchScore: bestScore.toFixed(2),
            matchMethod,
            calculatedTLTotal: isNaN(calculatedTLTotal) ? "0.00" : calculatedTLTotal.toFixed(2),
            validation: { isTotalMismatch, expectedTotal: isNaN(expectedTotal) ? "0.00" : expectedTotal.toFixed(2) }
        };
    }));
    const sumLineTotal = enrichedItems.reduce((acc, i) => acc + i.total + (i.taxAmount || 0), 0);
    const globalDiff = Math.abs(sumLineTotal - totals.totalAmount);
    const isGlobalMatch = globalDiff < (totals.totalAmount * 0.05);

    return {
        ...parsedData,
        supplier,
        dbSupplier: dbSupplier || null,
        ibanAlert,
        items: enrichedItems,
        globalValidation: {
            sumLineTotal: isNaN(sumLineTotal) ? "0.00" : sumLineTotal.toFixed(2),
            invoicePayable: totals.totalAmount,
            currency: totals.currency,
            exchangeRate: totals.exchangeRate,
            isGlobalMatch
        }
    };
};

exports.saveInvoice = async (req, res) => {
    const { supplier, items, invoiceDate, currencyRate } = req.body;
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        let supplierID = supplier.existingID;
        if (!supplierID) {
            const supRes = await transaction.request()
                .input('TedarikciAdi', sql.NVarChar, supplier.name).input('VergiNo', sql.NVarChar, supplier.taxID).input('IBAN', sql.NVarChar, supplier.iban).input('Adres', sql.NVarChar, supplier.address)
                .query(`INSERT INTO Tedarikciler (TedarikciAdi, VergiNo, IBAN, Adres) OUTPUT INSERTED.TedarikciID VALUES (@TedarikciAdi, @VergiNo, @IBAN, @Adres)`);
            supplierID = supRes.recordset[0].TedarikciID;
        } else if (supplier.updateIBAN && supplier.iban) {
            await transaction.request().input('ID', sql.Int, supplierID).input('IBAN', sql.NVarChar, supplier.iban).query(`UPDATE Tedarikciler SET IBAN = @IBAN WHERE TedarikciID = @ID`);
        }
        for (const item of items) {
            let stockID = item.matchedStock?.StokID;
            const rate = parseFloat(currencyRate) || 1;
            const unitPriceTL = item.price * rate;
            if (!stockID && item.createNewStock) {
                const stockRes = await transaction.request()
                    .input('StokAdi', sql.NVarChar, item.name).input('AnaBirim', sql.NVarChar, item.unit).input('AlisFiyati', sql.Decimal(18, 2), unitPriceTL).input('StokKodu', sql.NVarChar, item.stockCode || ('AUTO-' + Date.now())).query(`INSERT INTO StokKartlari (StokAdi, AnaBirim, AlisFiyati, StokKodu, MevcutStok) OUTPUT INSERTED.StokID VALUES (@StokAdi, @AnaBirim, @AlisFiyati, @StokKodu, 0)`);
                stockID = stockRes.recordset[0].StokID;
            }
            if (stockID) {
                const quantity = parseFloat(item.quantity) * (parseFloat(item.conversionFactor) || 1);
                await transaction.request().input('StokID', sql.Int, stockID).input('CariID', sql.Int, supplierID).input('HareketTipi', sql.NVarChar, 'Giris').input('Miktar', sql.Decimal(18, 2), quantity).input('BirimFiyat', sql.Decimal(18, 2), unitPriceTL).input('Tarih', sql.DateTime, invoiceDate || new Date()).input('BelgeNo', sql.NVarChar, 'AUTO-INV').query(`INSERT INTO StokHareketleri (StokID, CariID, HareketTipi, Miktar, BirimFiyat, Tarih, BelgeNo) VALUES (@StokID, @CariID, @HareketTipi, @Miktar, @BirimFiyat, @Tarih, @BelgeNo)`);
            }
        }
        await transaction.commit();
        res.json({ message: 'Fatura ve stok hareketleri kaydedildi.' });
    } catch (err) {
        await transaction.rollback();
        console.error(err);
        res.status(500).json({ message: 'Kayıt hatası: ' + err.message });
    }
};
