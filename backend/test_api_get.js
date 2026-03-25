const axios = require('axios');
(async () => {
    try {
        const loginRes = await axios.post('http://localhost:5001/api/auth/login', { kullaniciAdi: "admin", sifre: "admin" });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        const res = await axios.get('http://localhost:5001/api/stock-cards', { headers });
        console.log('Sample Stock Card:', JSON.stringify(res.data[0], null, 2));
    } catch (err) {
        console.error("ERROR:", err.response ? err.response.data : err.message);
    }
})();
