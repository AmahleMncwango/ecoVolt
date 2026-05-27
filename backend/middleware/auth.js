const jwt = require('jsonwebtoken');
const db = require('../db/db');

// Verify JWT and attach user to req
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [rows] = await db.query(
            'SELECT id, email, full_name, role FROM users WHERE id = ?',
            [decoded.userId]
        );
        if (rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = rows[0];
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Generic role guard. Usage: requireRole('admin'), requireRole('admin','management')
const requireRole = (...allowed) => (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
        return res.status(403).json({
            error: `Access denied. Required role: ${allowed.join(' or ')}`
        });
    }
    next();
};

const requireAdmin = requireRole('admin');

module.exports = { verifyToken, requireAdmin, requireRole };
