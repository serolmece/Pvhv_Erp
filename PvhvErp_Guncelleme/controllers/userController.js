const { poolPromise, sql } = require('../database/db');
const bcrypt = require('bcryptjs');

// Helper to get or create role
const getOrCreateRole = async (pool, roleName) => {
    let result = await pool.request()
        .input('RoleName', sql.NVarChar, roleName)
        .query('SELECT RoleID FROM Roles WHERE RoleName = @RoleName');

    if (result.recordset.length > 0) {
        return result.recordset[0].RoleID;
    } else {
        const newRoleResult = await pool.request()
            .input('RoleName', sql.NVarChar, roleName)
            .query('INSERT INTO Roles (RoleName) OUTPUT INSERTED.RoleID VALUES (@RoleName)');
        return newRoleResult.recordset[0].RoleID;
    }
};

exports.getUsers = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT u.UserID, u.Username, u.Fullname, u.Email, r.RoleName FROM Users u LEFT JOIN Roles r ON u.RoleID = r.RoleID');
        res.json(result.recordset);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.createUser = async (req, res) => {
    const { username, password, roleName, fullname, email } = req.body;
    try {
        const pool = await poolPromise;

        // Check if user already exists
        const checkUser = await pool.request()
            .input('Username', sql.NVarChar, username)
            .query('SELECT UserID FROM Users WHERE Username = @Username');

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor.' });
        }

        const roleId = await getOrCreateRole(pool, roleName || 'User');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.request()
            .input('Username', sql.NVarChar, username)
            .input('PasswordHash', sql.NVarChar, hashedPassword)
            .input('RoleID', sql.Int, roleId)
            .input('Fullname', sql.NVarChar, fullname || '')
            .input('Email', sql.NVarChar, email || '')
            .query('INSERT INTO Users (Username, PasswordHash, RoleID, Fullname, Email) VALUES (@Username, @PasswordHash, @RoleID, @Fullname, @Email)');

        res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, password, roleName, fullname, email } = req.body;
    try {
        const pool = await poolPromise;

        // Check if username is taken by another user
        if (username) {
            const checkUser = await pool.request()
                .input('Username', sql.NVarChar, username)
                .input('UserID', sql.Int, id)
                .query('SELECT UserID FROM Users WHERE Username = @Username AND UserID != @UserID');
            if (checkUser.recordset.length > 0) {
                return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor.' });
            }
        }

        let query = 'UPDATE Users SET Username = @Username, Fullname = @Fullname, Email = @Email, RoleID = @RoleID';
        const roleId = await getOrCreateRole(pool, roleName || 'User');

        const request = pool.request()
            .input('UserID', sql.Int, id)
            .input('Username', sql.NVarChar, username)
            .input('RoleID', sql.Int, roleId)
            .input('Fullname', sql.NVarChar, fullname || '')
            .input('Email', sql.NVarChar, email || '');

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query += ', PasswordHash = @PasswordHash';
            request.input('PasswordHash', sql.NVarChar, hashedPassword);
        }

        query += ' WHERE UserID = @UserID';

        await request.query(query);
        res.json({ message: 'Kullanıcı başarıyla güncellendi' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('UserID', sql.Int, id)
            .query('DELETE FROM Users WHERE UserID = @UserID');
        res.json({ message: 'Kullanıcı başarıyla silindi' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
