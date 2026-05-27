const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db/db');

const VALID_ROLES = ['admin', 'maintenance', 'management'];

// Tighter limiter for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many auth attempts, try again in 15 minutes.' }
});

// --- Helpers --------------------------------------------------------------
const isValidEmail = (v) =>
    typeof v === 'string' &&
    v.length <= 100 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const isStrongPassword = (v) =>
    typeof v === 'string' && v.length >= 6 && v.length <= 128;

// --- Register -------------------------------------------------------------
router.post('/register', authLimiter, async (req, res) => {
    let { email, password, role, full_name } = req.body || {};

    if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email required' });
    if (!isStrongPassword(password)) return res.status(400).json({ error: 'Password must be 6-128 characters' });
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (full_name && (typeof full_name !== 'string' || full_name.length > 120)) {
        return res.status(400).json({ error: 'Invalid full name' });
    }
    email = email.trim().toLowerCase();

    try {
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (email, full_name, password_hash, role) VALUES (?, ?, ?, ?)',
            [email, full_name || null, hashedPassword, role]
        );

        res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertId,
            role
        });
    } catch (error) {
        console.error('Register error:', error.message);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// --- Login ----------------------------------------------------------------
// The user MUST pick the role they are signing in as; it must match the
// role stored for the account. This prevents privilege confusion.
router.post('/login', authLimiter, async (req, res) => {
    let { email, password, role } = req.body || {};

    if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email required' });
    if (!isStrongPassword(password)) return res.status(400).json({ error: 'Password required' });
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Please choose a role' });
    email = email.trim().toLowerCase();

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = users[0];

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.role !== role) {
            return res.status(403).json({
                error: `This account is not registered as ${role}. Please select the correct role.`
            });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;
