const bcrypt = require('bcryptjs');

async function test() {
    const salt = await bcrypt.genSalt(10);
    const password = "testpassword123";
    const hashedPassword = await bcrypt.hash(password, salt);
    
    console.log("Original: ", password);
    console.log("Hash: ", hashedPassword);
    console.log("Length: ", hashedPassword.length);
    
    const isValid = await bcrypt.compare(password, hashedPassword);
    console.log("IsValid: ", isValid);
}
test();
