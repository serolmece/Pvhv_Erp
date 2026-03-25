const axios = require('axios');
(async () => {
    try {
        const loginRes = await axios.post('http://localhost:5001/api/auth/login', { kullaniciAdi: "admin", sifre: "admin" });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        const payload = {
            stokKodu: "TEST-DEC3",
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
        const res = await axios.post('http://localhost:5001/api/stock-cards', payload, { headers });
        console.log("Create OK", res.status);

        const res2 = await axios.get('http://localhost:5001/api/stock-cards', { headers });
        const st = res2.data.find(x => x.StokKodu === 'TEST-DEC3');
        console.log("Fetched AlisFiyati:", typeof st.AlisFiyati, st.AlisFiyati);
        console.log("Fetched SatisFiyati:", typeof st.SatisFiyati, st.SatisFiyati);

        const payloadUpdate = { ...payload, satisFiyati: "7554.99", alisFiyati: "7554.91" };
        const res3 = await axios.put(`http://localhost:5001/api/stock-cards/${st.StokID}`, payloadUpdate, { headers });
        console.log("Update OK", res3.status);

        const res4 = await axios.get('http://localhost:5001/api/stock-cards', { headers });
        const stUpdated = res4.data.find(x => x.StokKodu === 'TEST-DEC3');
        console.log("Fetched Updated SatisFiyati:", typeof stUpdated.SatisFiyati, stUpdated.SatisFiyati);

        await axios.delete('http://localhost:5001/api/stock-cards/' + st.StokID, { headers });
        console.log("Deleted");
    } catch (err) {
        console.error("ERROR:");
        console.error(err.response ? err.response.data : err.message);
    }
})();
