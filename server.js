const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Supabase initialization
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// IoT Sensor Simulation
class SensorSimulator {
  constructor(roomId, buildingId) {
    this.roomId = roomId;
    this.buildingId = buildingId;
    this.isOccupied = false;
    this.energyUsage = 0;
    this.interval = null;
  }

  start() {
    this.interval = setInterval(() => {
      if (Math.random() < 0.3) {
        this.isOccupied = !this.isOccupied;
      }
      
      if (this.isOccupied) {
        this.energyUsage = Math.floor(Math.random() * 300) + 200;
      } else {
        this.energyUsage = Math.floor(Math.random() * 50);
      }

      let alert = null;
      if (!this.isOccupied && this.energyUsage > 100) {
        alert = {
          roomId: this.roomId,
          buildingId: this.buildingId,
          type: 'energy_waste',
          message: `Energy waste detected in Room ${this.roomId}: ${this.energyUsage}W usage while unoccupied`,
          severity: 'high',
          timestamp: new Date().toISOString()
        };
      }

      this.saveSensorReading(alert);
      
      io.emit('sensor-data', {
        roomId: this.roomId,
        buildingId: this.buildingId,
        isOccupied: this.isOccupied,
        energyUsage: this.energyUsage,
        timestamp: new Date().toISOString(),
        alert: alert
      });

    }, 3000);
  }

  async saveSensorReading(alert) {
    try {
      const { error: readingError } = await supabase
        .from('sensor_readings')
        .insert([
          {
            room_id: this.roomId,
            building_id: this.buildingId,
            energy_usage: this.energyUsage,
            is_occupied: this.isOccupied,
            timestamp: new Date().toISOString()
          }
        ]);

      if (readingError) throw readingError;

      if (alert) {
        const { error: alertError } = await supabase
          .from('alerts')
          .insert([
            {
              room_id: this.roomId,
              building_id: this.buildingId,
              type: alert.type,
              message: alert.message,
              severity: alert.severity,
              status: 'active',
              timestamp: alert.timestamp
            }
          ]);

        if (alertError) throw alertError;
        io.emit('new-alert', alert);
      }
    } catch (error) {
      console.error('Error saving sensor data:', error);
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

const sensors = new Map();

async function initializeSensors() {
  try {
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('id, building_id');
    
    if (error) {
      console.error('Error loading rooms:', error);
      return;
    }
    
    if (!rooms || rooms.length === 0) {
      console.log('No rooms found. Please add rooms first.');
      return;
    }
    
    rooms.forEach(room => {
      if (!sensors.has(room.id)) {
        const sensor = new SensorSimulator(room.id, room.building_id);
        sensor.start();
        sensors.set(room.id, sensor);
      }
    });
    
    console.log(`Initialized ${sensors.size} sensors`);
  } catch (error) {
    console.error('Error initializing sensors:', error);
  }
}

// API Routes

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    console.log('Registration attempt:', { name, email, role });
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new user
    const { data, error } = await supabase
      .from('users')
      .insert([{ 
        name, 
        email, 
        password: hashedPassword, 
        role: role || 'user',
        created_at: new Date().toISOString() 
      }])
      .select();
    
    if (error) {
      console.error('Registration error:', error);
      throw error;
    }
    
    console.log('User registered successfully:', email);
    
    // Don't send password back
    const user = data[0];
    delete user.password;
    
    res.json({ success: true, user: user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', email);
    
    // Find user by email
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      console.log('User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    console.log('User found, comparing passwords...');
    
    // Compare password with hashed password
    const isValidPassword = await bcrypt.compare(password, data.password);
    
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    console.log('Login successful:', email);
    
    // Don't send password back
    const user = { ...data };
    delete user.password;
    
    res.json({ success: true, user: user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Get current user (for session check)
app.get('/api/auth/me', async (req, res) => {
  // This is a simplified version - in production, you'd use JWT tokens
  res.json({ success: false, error: 'Not authenticated' });
});

// Buildings CRUD
app.get('/api/buildings', async (req, res) => {
  try {
    const { data, error } = await supabase.from('buildings').select('*').order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/buildings', async (req, res) => {
  try {
    const { name, location, floors } = req.body;
    const { data, error } = await supabase
      .from('buildings')
      .insert([{ name, location, floors, created_at: new Date().toISOString() }])
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/buildings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, floors } = req.body;
    const { data, error } = await supabase
      .from('buildings')
      .update({ name, location, floors, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/buildings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('buildings').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Rooms CRUD
app.get('/api/rooms', async (req, res) => {
  try {
    const { buildingId } = req.query;
    let query = supabase.from('rooms').select('*, buildings(name)');
    if (buildingId) query = query.eq('building_id', buildingId);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { building_id, room_number, room_type, capacity } = req.body;
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ building_id, room_number, room_type, capacity, created_at: new Date().toISOString() }])
      .select();
    if (error) throw error;
    
    if (data && data[0]) {
      const sensor = new SensorSimulator(data[0].id, building_id);
      sensor.start();
      sensors.set(data[0].id, sensor);
    }
    
    res.json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { room_number, room_type, capacity } = req.body;
    const { data, error } = await supabase
      .from('rooms')
      .update({ room_number, room_type, capacity, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (sensors.has(id)) {
      sensors.get(id).stop();
      sensors.delete(id);
    }
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Sensor Readings
app.get('/api/sensor-readings', async (req, res) => {
  try {
    const { roomId, limit = 100 } = req.query;
    let query = supabase
      .from('sensor_readings')
      .select('*, rooms(room_number, buildings(name))')
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit));
    if (roomId) query = query.eq('room_id', roomId);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('alerts')
      .select('*, rooms(room_number, buildings(name))')
      .order('timestamp', { ascending: false })
      .limit(50);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { data, error } = await supabase
      .from('alerts')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Analytics
app.get('/api/analytics/summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: readings, error } = await supabase
      .from('sensor_readings')
      .select('energy_usage')
      .gte('timestamp', today.toISOString());
    
    if (error) throw error;
    
    const totalEnergy = readings && readings.length > 0 
      ? readings.reduce((sum, r) => sum + (r.energy_usage || 0), 0) : 0;
    const avgEnergy = readings && readings.length > 0 ? totalEnergy / readings.length : 0;
    
    const { count: activeAlerts } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    res.json({
      totalEnergyToday: totalEnergy,
      averageEnergyUsage: avgEnergy,
      activeAlerts: activeAlerts || 0,
      totalReadings: readings ? readings.length : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/trends', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('energy_usage, timestamp')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });
    
    if (error) throw error;
    
    const trends = {};
    if (data) {
      data.forEach(reading => {
        const date = reading.timestamp.split('T')[0];
        if (!trends[date]) trends[date] = { total: 0, count: 0 };
        trends[date].total += reading.energy_usage;
        trends[date].count++;
      });
    }
    
    const trendData = Object.entries(trends).map(([date, values]) => ({
      date,
      averageEnergy: values.total / values.count
    }));
    
    res.json(trendData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Serve login page as default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Socket.io
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => console.log('Client disconnected'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`EcoVolt Server running on port ${PORT}`);
  console.log(`Link: http://localhost:${PORT}`);
  await initializeSensors();
});