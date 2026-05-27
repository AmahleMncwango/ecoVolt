const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET all buildings (authenticated)
router.get('/', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM buildings ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create new building (admin only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
    const { name, location } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Building name is required' });
    }
    try {
        const [result] = await db.query(
            'INSERT INTO buildings (name, location) VALUES (?, ?)',
            [name, location || null]
        );
        const [newBuilding] = await db.query('SELECT * FROM buildings WHERE id = ?', [result.insertId]);
        res.status(201).json(newBuilding[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update building (admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, location } = req.body;
    try {
        await db.query('UPDATE buildings SET name = ?, location = ? WHERE id = ?', [name, location, id]);
        const [updated] = await db.query('SELECT * FROM buildings WHERE id = ?', [id]);
        res.json(updated[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE building (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM buildings WHERE id = ?', [id]);
        res.json({ message: 'Building deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;