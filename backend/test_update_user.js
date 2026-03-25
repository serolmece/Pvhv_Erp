const axios = require('axios');
async function test() {
    try {
        console.log("Logging in as Bulent to get token...");
        const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
            username: 'Bulent',
            password: '123456'
        });

        const token = loginRes.data.token;
        console.log("Got token");

        console.log("Updating Serol's UserID 3...");
        const res = await axios.put('http://localhost:5001/api/users/3', {
            username: 'Serol',
            fullname: 'Serol Mece',
            email: 'serol@test.com',
            roleName: 'Admin',
            password: 'newpassword123'
        }, {
            headers: { Authorization: 'Bearer ' + token }
        });

        console.log("Success:", res.data);
    } catch (e) {
        console.error("Failed:", e.response ? e.response.data : e.message);
    }
}
test();
