const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { verifyToken } = require('../middleware/auth');

// Simple linear regression on last N readings to predict next power value
router.get('/predict', verifyToken, async (req, res) => {
    try {
        // Get last 30 power readings across all devices (or per building)
        const [readings] = await db.query(`
            SELECT power_consumption, recorded_at 
            FROM sensor_readings 
            ORDER BY recorded_at DESC 
            LIMIT 30
        `);

        if (readings.length < 5) {
            return res.json({
                prediction: null,
                message: 'Not enough data for prediction. More readings needed.'
            });
        }

        // Reverse to chronological order
        const data = readings.reverse();
        const n = data.length;

        // Simple linear regression: y = a + bx
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            const x = i + 1; // time index
            const y = data[i].power_consumption;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const nextIndex = n + 1;
        const prediction = slope * nextIndex + intercept;
        const predictedValue = Math.max(0, Math.round(prediction * 10) / 10);

        // Determine trend
        let trend = 'stable';
        if (slope > 0.5) trend = 'increasing';
        else if (slope < -0.5) trend = 'decreasing';

        // Get average consumption
        const [avgResult] = await db.query('SELECT AVG(power_consumption) as avgPower FROM sensor_readings');
        const avgPower = Math.round(avgResult[0].avgPower * 10) / 10;

        res.json({
            prediction: predictedValue,
            trend,
            averagePower: avgPower,
            confidence: n > 20 ? 'high' : (n > 10 ? 'medium' : 'low'),
            message: `AI predicts next power consumption ~${predictedValue}W. Trend is ${trend}.`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET energy summary per building
router.get('/summary', verifyToken, async (req, res) => {
    try {
        const [summary] = await db.query(`
            SELECT 
                b.id as building_id,
                b.name as building_name,
                COUNT(DISTINCT d.id) as total_devices,
                AVG(sr.power_consumption) as avg_power,
                SUM(sr.power_consumption) as total_power,
                COUNT(a.id) as active_alerts
            FROM buildings b
            LEFT JOIN rooms r ON b.id = r.building_id
            LEFT JOIN devices d ON r.id = d.room_id
            LEFT JOIN sensor_readings sr ON d.id = sr.device_id
            LEFT JOIN alerts a ON r.id = a.room_id AND a.resolved = FALSE
            GROUP BY b.id
        `);
        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;