const axios = require('axios');
(async () => {
    try {
        const loginRes = await axios.post('http://localhost:5001/api/auth/login', { kullaniciAdi: "admin", sifre: "admin" });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        const payload = {
            stokKodu: "TEST-DEC-X",
            stokAdi: "Test Decimal",
            kategoriId: null,
            anaBirim: "Adet",
            alisFiyati: "4113.85",
            satisFiyati: "4113.85",
            kdvOrani: 20,
            paraBirimi: "TL",
            minStok: 0,
            maxStok: 0
        };
        await axios.post('http://localhost:5001/api/stock-cards', payload, { headers });

        const res2 = await axios.get('http://localhost:5001/api/stock-cards', { headers });
        const st = res2.data.find(x => x.StokKodu === 'TEST-DEC-X');
        console.log("FETCHED AlisFiyati: " + st.AlisFiyati);

        await axios.delete('http://localhost:5001/api/stock-cards/' + st.StokID, { headers });
    } catch (err) {
        console.log("ERROR:", err.response ? err.response.data : err.message);
    }
})();
