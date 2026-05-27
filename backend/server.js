require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db/db');
const { startSimulation } = require('./services/sensorSimulator');

const app = express();

// --- Security middleware --------------------------------------------------
app.use(helmet({
    contentSecurityPolicy: false // disabled so inline scripts in HTML still load
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// --- Routes ---------------------------------------------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/buildings', require('./routes/buildings'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/sensor-readings', require('./routes/sensorReadings'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/analytics', require('./routes/analytics'));

// --- Sample data seeding --------------------------------------------------
async function initializeSampleData() {
    try {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM buildings');
        if (rows[0].count > 0) {
            console.log('📦 Buildings exist – skipping sample data.');
            return;
        }
        console.log('🌱 Creating sample campus data...');

        await db.query(`
            INSERT INTO buildings (name, location) VALUES
            ('Main Academic Building', 'Central Campus'),
            ('Engineering Hall', 'East Campus'),
            ('Library', 'North Campus')
        `);
        const [buildings] = await db.query('SELECT id, name FROM buildings');
        const mainId = buildings.find(b => b.name === 'Main Academic Building').id;
        const engId = buildings.find(b => b.name === 'Engineering Hall').id;
        const libId = buildings.find(b => b.name === 'Library').id;

        await db.query(`
            INSERT INTO rooms (building_id, room_number, threshold_watt) VALUES
            (?, 'A-101', 50),
            (?, 'A-102', 60),
            (?, 'Lab 1', 80),
            (?, 'Lecture Hall', 100),
            (?, 'Main Reading Room', 40)
        `, [mainId, mainId, engId, engId, libId]);

        const [rooms] = await db.query('SELECT id, room_number FROM rooms');
        const roomMap = {};
        rooms.forEach(r => { roomMap[r.room_number] = r.id; });

        await db.query(`
            INSERT INTO devices (room_id, device_name, device_type, typical_power) VALUES
            (?, 'Ceiling Lights', 'Lighting', 120),
            (?, 'Projector', 'AV', 300),
            (?, 'Workstation PCs', 'IT', 400),
            (?, '3D Printers', 'Lab', 800),
            (?, 'LED Panel', 'Lighting', 80)
        `, [roomMap['A-101'], roomMap['A-101'], roomMap['Lab 1'], roomMap['Lab 1'], roomMap['Main Reading Room']]);

        console.log('✅ Sample campus created! Sensors will now generate data.');
    } catch (err) {
        console.error('Sample data error:', err.message);
    }
}

initializeSampleData().then(() => {
    startSimulation();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 EcoVolt backend running on port ${PORT}`));
