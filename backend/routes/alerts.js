const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { verifyToken, requireAdmin, requireRole } = require('../middleware/auth');

// GET all alerts (any logged-in user — admin/maintenance/management can view)
router.get('/', verifyToken, async (req, res) => {
    const unresolvedOnly = req.query.unresolved === 'true';
    let query = `
        SELECT a.*, r.room_number, b.name as building_name
        FROM alerts a
        JOIN rooms r ON a.room_id = r.id
        JOIN buildings b ON r.building_id = b.id
    `;
    if (unresolvedOnly) query += ` WHERE a.resolved = FALSE`;
    query += ` ORDER BY a.created_at DESC`;

    try {
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT resolve alert — admin OR maintenance only (NOT management)
router.put('/:id/resolve', verifyToken, requireRole('admin', 'maintenance'), async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE alerts SET resolved = TRUE WHERE id = ?', [id]);
        res.json({ message: 'Alert resolved' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE alert — admin only
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM alerts WHERE id = ?', [id]);
        res.json({ message: 'Alert deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
