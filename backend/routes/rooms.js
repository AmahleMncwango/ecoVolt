const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET all rooms with building name
router.get('/', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, b.name as building_name 
            FROM rooms r
            JOIN buildings b ON r.building_id = b.id
            ORDER BY r.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET rooms by building
router.get('/building/:buildingId', verifyToken, async (req, res) => {
    const { buildingId } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM rooms WHERE building_id = ?', [buildingId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create room (admin only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
    const { building_id, room_number, threshold_watt } = req.body;
    if (!building_id || !room_number) {
        return res.status(400).json({ error: 'Building ID and room number required' });
    }
    try {
        const [result] = await db.query(
            'INSERT INTO rooms (building_id, room_number, threshold_watt) VALUES (?, ?, ?)',
            [building_id, room_number, threshold_watt || 50]
        );
        const [newRoom] = await db.query('SELECT * FROM rooms WHERE id = ?', [result.insertId]);
        res.status(201).json(newRoom[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update room (admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { room_number, threshold_watt } = req.body;
    try {
        await db.query('UPDATE rooms SET room_number = ?, threshold_watt = ? WHERE id = ?', [room_number, threshold_watt, id]);
        const [updated] = await db.query('SELECT * FROM rooms WHERE id = ?', [id]);
        res.json(updated[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE room (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM rooms WHERE id = ?', [id]);
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;