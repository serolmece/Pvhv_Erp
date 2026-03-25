const axios = require('axios');
async function run() {
    try {
        const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
            username: 'Bulent',
            password: '123456'
        });
        const token = loginRes.data.token;

        const res = await axios.put('http://localhost:5001/api/users/3', {
            username: 'Serol',
            password: 'new_password123',
            fullname: '',
            email: '',
            roleName: 'Admin'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log("Success:", res.data);
    } catch (err) {
        console.error("FAIL:", err.response ? err.response.data : err.message);
    }
}
run();
