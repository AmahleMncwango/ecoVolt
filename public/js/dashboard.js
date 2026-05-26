let energyChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardData();
    initializeChart();
    
    window.addEventListener('sensorUpdate', (event) => {
        updateDashboardWithSensorData(event.detail);
    });
    
    window.addEventListener('newAlert', (event) => {
        addAlertToList(event.detail);
    });
    
    setInterval(refreshAlerts, 30000);
});

async function loadDashboardData() {
    try {
        const summary = await apiRequest('/api/analytics/summary');
        const currentUsageWatts = summary.averageEnergyUsage || 0;
        
        const currentUsageEl = document.getElementById('currentUsage');
        if (currentUsageEl) currentUsageEl.textContent = Math.round(currentUsageWatts);
        
        const usageStatus = document.getElementById('usageStatus');
        if (usageStatus) {
            if (currentUsageWatts > 500) {
                usageStatus.textContent = 'High Usage';
                usageStatus.style.color = '#ff4757';
            } else if (currentUsageWatts > 200) {
                usageStatus.textContent = 'Moderate Usage';
                usageStatus.style.color = '#ff9800';
            } else {
                usageStatus.textContent = 'Normal';
                usageStatus.style.color = '#4caf50';
            }
        }
        
        const rooms = await apiRequest('/api/rooms');
        const totalRoomsEl = document.getElementById('totalRooms');
        if (totalRoomsEl) totalRoomsEl.textContent = rooms.length;
        
        const readings = await apiRequest('/api/sensor-readings?limit=200');
        const activeRoomsSet = new Set(readings.filter(r => r.is_occupied).map(r => r.room_id));
        const activeRoomsEl = document.getElementById('activeRooms');
        if (activeRoomsEl) activeRoomsEl.textContent = activeRoomsSet.size;
        
        await refreshAlerts();
        await loadBuildingSummary();
        await loadTopConsumers();
        await loadChartData();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function initializeChart() {
    const ctx = document.getElementById('energyChart');
    if (!ctx) return;
    
    energyChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Energy Usage (Watts)',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Watts' } },
                x: { title: { display: true, text: 'Time' } }
            }
        }
    });
}

async function loadChartData() {
    try {
        const trends = await apiRequest('/api/analytics/trends?days=1');
        const labels = trends.map(t => new Date(t.date).toLocaleTimeString());
        const data = trends.map(t => t.averageEnergy);
        
        if (energyChart) {
            energyChart.data.labels = labels.slice(-20);
            energyChart.data.datasets[0].data = data.slice(-20);
            energyChart.update();
        }
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
}

function updateDashboardWithSensorData(sensorData) {
    const currentUsageEl = document.getElementById('currentUsage');
    if (currentUsageEl) currentUsageEl.textContent = sensorData.energyUsage;
    
    if (energyChart) {
        const newLabel = new Date(sensorData.timestamp).toLocaleTimeString();
        energyChart.data.labels.push(newLabel);
        energyChart.data.datasets[0].data.push(sensorData.energyUsage);
        
        if (energyChart.data.labels.length > 20) {
            energyChart.data.labels.shift();
            energyChart.data.datasets[0].data.shift();
        }
        energyChart.update();
    }
}

async function refreshAlerts() {
    try {
        const alerts = await apiRequest('/api/alerts?status=active');
        displayAlerts(alerts);
    } catch (error) {
        console.error('Error refreshing alerts:', error);
    }
}

function displayAlerts(alerts) {
    const alertsList = document.getElementById('alertsList');
    if (!alertsList) return;
    
    if (alerts.length === 0) {
        alertsList.innerHTML = '<p class="no-alerts">No active alerts</p>';
        return;
    }
    
    alertsList.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.severity}">
            <div class="alert-content">
                <strong><i class="fas fa-exclamation-triangle"></i> ${alert.type}</strong>
                <p>${alert.message}</p>
                <small>Room ${alert.rooms?.room_number} - ${new Date(alert.timestamp).toLocaleString()}</small>
            </div>
            <button onclick="resolveAlert('${alert.id}')" class="btn-resolve">
                <i class="fas fa-check"></i> Resolve
            </button>
        </div>
    `).join('');
}

function addAlertToList(alert) {
    const alertsList = document.getElementById('alertsList');
    if (!alertsList) return;
    
    const alertHtml = `
        <div class="alert-item ${alert.severity}" id="alert-${Date.now()}">
            <div class="alert-content">
                <strong><i class="fas fa-exclamation-triangle"></i> ${alert.type}</strong>
                <p>${alert.message}</p>
                <small>Room ${alert.roomId} - ${new Date(alert.timestamp).toLocaleString()}</small>
            </div>
            <button onclick="resolveAlert('${alert.id}')" class="btn-resolve">
                <i class="fas fa-check"></i> Resolve
            </button>
        </div>
    `;
    
    if (alertsList.querySelector('.no-alerts')) {
        alertsList.innerHTML = alertHtml;
    } else {
        alertsList.insertAdjacentHTML('afterbegin', alertHtml);
    }
}

async function resolveAlert(alertId) {
    try {
        await apiRequest(`/api/alerts/${alertId}`, 'PUT', { status: 'resolved' });
        await refreshAlerts();
    } catch (error) {
        console.error('Error resolving alert:', error);
    }
}

async function loadBuildingSummary() {
    try {
        const buildings = await apiRequest('/api/buildings');
        const rooms = await apiRequest('/api/rooms');
        const readings = await apiRequest('/api/sensor-readings?limit=500');
        
        const summary = buildings.map(building => {
            const buildingRooms = rooms.filter(r => r.building_id === building.id);
            const buildingReadings = readings.filter(r => r.rooms?.building_id === building.id);
            const avgEnergy = buildingReadings.length > 0 
                ? buildingReadings.reduce((sum, r) => sum + r.energy_usage, 0) / buildingReadings.length : 0;
            
            return {
                name: building.name,
                roomCount: buildingRooms.length,
                avgEnergy: Math.round(avgEnergy)
            };
        });
        
        const summaryHtml = summary.map(b => `
            <div class="building-summary-item">
                <strong><i class="fas fa-building"></i> ${b.name}</strong>
                <div>Rooms: ${b.roomCount}</div>
                <div>Avg Energy: ${b.avgEnergy}W</div>
            </div>
        `).join('');
        
        const buildingSummaryEl = document.getElementById('buildingSummary');
        if (buildingSummaryEl) buildingSummaryEl.innerHTML = summaryHtml || '<p>No buildings found</p>';
    } catch (error) {
        console.error('Error loading building summary:', error);
    }
}

async function loadTopConsumers() {
    try {
        const readings = await apiRequest('/api/sensor-readings?limit=200');
        const roomConsumption = {};
        
        readings.forEach(reading => {
            const roomId = reading.room_id;
            if (!roomConsumption[roomId]) {
                roomConsumption[roomId] = {
                    roomNumber: reading.rooms?.room_number || roomId,
                    total: 0,
                    count: 0
                };
            }
            roomConsumption[roomId].total += reading.energy_usage;
            roomConsumption[roomId].count++;
        });
        
        const topConsumers = Object.values(roomConsumption)
            .map(room => ({ ...room, avg: room.total / room.count }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 5);
        
        const consumersHtml = topConsumers.map(consumer => `
            <div class="consumer-item">
                <span><i class="fas fa-door-open"></i> Room ${consumer.roomNumber}</span>
                <strong>${Math.round(consumer.avg)}W</strong>
            </div>
        `).join('');
        
        const topConsumersEl = document.getElementById('topConsumers');
        if (topConsumersEl) topConsumersEl.innerHTML = consumersHtml || '<p>No data available</p>';
    } catch (error) {
        console.error('Error loading top consumers:', error);
    }
}