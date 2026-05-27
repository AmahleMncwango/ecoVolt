const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { verifyToken } = require('../middleware/auth');

// GET recent sensor readings (last 50)
router.get('/', verifyToken, async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    try {
        const [rows] = await db.query(`
            SELECT sr.*, d.device_name, r.room_number, b.name as building_name
            FROM sensor_readings sr
            JOIN devices d ON sr.device_id = d.id
            JOIN rooms r ON d.room_id = r.id
            JOIN buildings b ON r.building_id = b.id
            ORDER BY sr.recorded_at DESC
            LIMIT ?
        `, [limit]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET latest reading per device
router.get('/latest', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT sr.*, d.device_name, r.room_number, b.name as building_name
            FROM sensor_readings sr
            JOIN devices d ON sr.device_id = d.id
            JOIN rooms r ON d.room_id = r.id
            JOIN buildings b ON r.building_id = b.id
            WHERE sr.recorded_at = (
                SELECT MAX(recorded_at) FROM sensor_readings WHERE device_id = d.id
            )
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;