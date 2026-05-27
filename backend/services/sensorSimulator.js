const db = require('../db/db');

const rand = (min, max) => Math.random() * (max - min) + min;

async function generateReading(device) {
    const hour = new Date().getHours();
    const isActiveHour = hour >= 8 && hour <= 22;
    const occupancy = isActiveHour ? Math.random() < 0.7 : Math.random() < 0.1;

    let power = 0;
    if (occupancy) {
        power = rand(device.typical_power * 0.6, device.typical_power);
    } else {
        power = Math.random() < 0.3 ? rand(15, device.typical_power * 0.5) : rand(0, 10);
    }

    await db.query(
        'INSERT INTO sensor_readings (device_id, occupancy, power_consumption) VALUES (?, ?, ?)',
        [device.id, occupancy, power]
    );

    // Alert if empty but high power
    const threshold = device.threshold_watt || 50;
    if (!occupancy && power > threshold) {
        const [existing] = await db.query(
            'SELECT id FROM alerts WHERE room_id = ? AND resolved = false',
            [device.room_id]
        );
        if (existing.length === 0) {
            await db.query(
                'INSERT INTO alerts (room_id, message, severity) VALUES (?, ?, ?)',
                [device.room_id, `⚠️ Energy waste: Room empty but using ${power.toFixed(1)}W (threshold ${threshold}W)`, 'warning']
            );
            console.log(`🔔 Alert for room ${device.room_id}`);
        }
    }
}

async function startSimulation() {
    console.log('🤖 IoT Sensor Simulation started...');
    setInterval(async () => {
        const [devices] = await db.query(`
            SELECT d.*, r.threshold_watt, r.id as room_id
            FROM devices d
            JOIN rooms r ON d.room_id = r.id
        `);
        if (devices.length === 0) {
            console.log('No devices yet – waiting for sample data...');
            return;
        }
        for (const device of devices) {
            await generateReading(device);
        }
        console.log(`📊 Simulated ${devices.length} devices at ${new Date().toLocaleTimeString()}`);
    }, 20000);
}

module.exports = { startSimulation };