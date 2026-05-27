const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET all devices with room and building info
router.get('/', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT d.*, r.room_number, r.threshold_watt, b.name as building_name, b.id as building_id
            FROM devices d
            JOIN rooms r ON d.room_id = r.id
            JOIN buildings b ON r.building_id = b.id
            ORDER BY d.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET devices by room
router.get('/room/:roomId', verifyToken, async (req, res) => {
    const { roomId } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM devices WHERE room_id = ?', [roomId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create device (admin only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
    const { room_id, device_name, device_type, typical_power } = req.body;
    if (!room_id || !device_name) {
        return res.status(400).json({ error: 'Room ID and device name required' });
    }
    try {
        const [result] = await db.query(
            'INSERT INTO devices (room_id, device_name, device_type, typical_power) VALUES (?, ?, ?, ?)',
            [room_id, device_name, device_type || null, typical_power || 100]
        );
        const [newDevice] = await db.query('SELECT * FROM devices WHERE id = ?', [result.insertId]);
        res.status(201).json(newDevice[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update device (admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { device_name, device_type, typical_power } = req.body;
    try {
        await db.query(
            'UPDATE devices SET device_name = ?, device_type = ?, typical_power = ? WHERE id = ?',
            [device_name, device_type, typical_power, id]
        );
        const [updated] = await db.query('SELECT * FROM devices WHERE id = ?', [id]);
        res.json(updated[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE device (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM devices WHERE id = ?', [id]);
        res.json({ message: 'Device deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;