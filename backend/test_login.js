const axios = require('axios');
async function test() {
    try {
        const res = await axios.post('http://localhost:5001/api/auth/login', {
            username: 'Bulent',
            password: '123' // Or something, wait I don't know the password
        });
        console.log("Login success:", res.data);
    } catch (e) {
        console.error("Login failed:", e.response ? e.response.data : e.message);
    }
}
test();
