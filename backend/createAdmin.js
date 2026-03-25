const { poolPromise, sql } = require('./database/db');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
    try {
        const pool = await poolPromise;
        const username = 'admin';
        const rawPassword = '20152019';
        const roleName = 'Admin';

        // 1. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        console.log(`Password hashed successfully.`);

        // 2. Get Role ID for 'Admin'
        const roleResult = await pool.request()
            .input('RoleName', sql.NVarChar, roleName)
            .query('SELECT RoleID FROM Roles WHERE RoleName = @RoleName');

        let roleId;
        if (roleResult.recordset.length > 0) {
            roleId = roleResult.recordset[0].RoleID;
        } else {
            console.error('Role "Admin" not found. Please ensure roles are seeded.');
            // Fallback: Create role if not exists (though schema should have seeded it)
            const newRoleResult = await pool.request()
                .input('RoleName', sql.NVarChar, roleName)
                .query('INSERT INTO Roles (RoleName) OUTPUT INSERTED.RoleID VALUES (@RoleName)');
            roleId = newRoleResult.recordset[0].RoleID;
            console.log('Created Admin role.');
        }

        // 3. Create User
        // Check if user exists first to avoid unique constraint error
        const userCheck = await pool.request()
            .input('Username', sql.NVarChar, username)
            .query('SELECT UserID FROM Users WHERE Username = @Username');

        if (userCheck.recordset.length > 0) {
            console.log('User "admin" already exists. Updating password...');
            await pool.request()
                .input('Username', sql.NVarChar, username)
                .input('PasswordHash', sql.NVarChar, hashedPassword)
                .query('UPDATE Users SET PasswordHash = @PasswordHash WHERE Username = @Username');
            console.log('Password updated for "admin".');
        } else {
            await pool.request()
                .input('Username', sql.NVarChar, username)
                .input('PasswordHash', sql.NVarChar, hashedPassword)
                .input('RoleID', sql.Int, roleId)
                .input('Fullname', sql.NVarChar, 'System Administrator')
                .input('Email', sql.NVarChar, 'admin@pvhverp.com') // Dummy email
                .query('INSERT INTO Users (Username, PasswordHash, RoleID, Fullname, Email) VALUES (@Username, @PasswordHash, @RoleID, @Fullname, @Email)');
            console.log('User "admin" created successfully.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error creating admin user:', err);
        process.exit(1);
    }
};

createAdmin();
