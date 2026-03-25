const { poolPromise, sql } = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('Username', sql.NVarChar, username)
            .query('SELECT u.*, r.RoleName FROM Users u JOIN Roles r ON u.RoleID = r.RoleID WHERE Username = @Username');

        const user = result.recordset[0];
        if (!user) return res.status(400).json({ message: 'User not found' });

        const validPass = await bcrypt.compare(password, user.PasswordHash);
        if (!validPass) return res.status(400).json({ message: 'Invalid password' });

        const token = jwt.sign({ id: user.UserID, role: user.RoleName }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.header('Authorization', token).json({ token, role: user.RoleName, username: user.Username });
    } catch (err) {
        // Send a 400 instead of a 500 so Plesk IIS pass it to frontend
        console.error("Login Caught Error:", err);
        res.status(400).json({
            message: 'Database Connection or System Error',
            errorDetails: err.type === 'DB_CONNECTION_ERROR' ? err.originalError : err.message,
            stack: err.stack
        });
    }
};

exports.register = async (req, res) => {
    const { username, password, roleName, fullname, email } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const pool = await poolPromise;

        // Get Role ID
        const roleResult = await pool.request()
            .input('RoleName', sql.NVarChar, roleName || 'User') // Default to User
            .query('SELECT RoleID FROM Roles WHERE RoleName = @RoleName');

        let roleId;
        if (roleResult.recordset.length > 0) {
            roleId = roleResult.recordset[0].RoleID;
        } else {
            // Create role if not exists (simplified logic, usually pre-seeded)
            const newRoleResult = await pool.request()
                .input('RoleName', sql.NVarChar, roleName || 'User')
                .query('INSERT INTO Roles (RoleName) OUTPUT INSERTED.RoleID VALUES (@RoleName)');
            roleId = newRoleResult.recordset[0].RoleID;
        }

        await pool.request()
            .input('Username', sql.NVarChar, username)
            .input('PasswordHash', sql.NVarChar, hashedPassword)
            .input('RoleID', sql.Int, roleId)
            .input('Fullname', sql.NVarChar, fullname)
            .input('Email', sql.NVarChar, email)
            .query('INSERT INTO Users (Username, PasswordHash, RoleID, Fullname, Email) VALUES (@Username, @PasswordHash, @RoleID, @Fullname, @Email)');

        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
