const testLogin = async () => {
    try {
        console.log('Attempting to login locally...');
        const response = await fetch('http://localhost:5001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: '20152019'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Login Successful!');
            console.log('Token:', data.token);
        } else {
            console.error('Login Failed!');
            console.error('Status:', response.status);
            console.error('Message:', data.message); // Should be "User not found" or "Invalid password"
        }

    } catch (error) {
        console.error('Request Error:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
};

testLogin();
