let trendChart = null;
let buildingChart = null;

document.addEventListener('DOMContentLoaded', () => {
    loadBuildings();
    loadRooms();
    loadAlertsManagement();
    loadAnalytics();
    
    const buildingForm = document.getElementById('buildingForm');
    if (buildingForm) buildingForm.addEventListener('submit', addBuilding);
    
    const roomForm = document.getElementById('roomForm');
    if (roomForm) roomForm.addEventListener('submit', addRoom);
});

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const tabToShow = document.getElementById(`${tabName}Tab`);
    if (tabToShow) tabToShow.classList.add('active');
    
    if (event && event.target) event.target.classList.add('active');
    
    if (tabName === 'alerts') loadAlertsManagement();
    else if (tabName === 'analytics') loadAnalytics();
}

async function loadBuildings() {
    try {
        const buildings = await apiRequest('/api/buildings');
        displayBuildings(buildings);
        
        const buildingSelect = document.getElementById('roomBuilding');
        if (buildingSelect) {
            buildingSelect.innerHTML = '<option value="">Select Building</option>' + 
                buildings.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading buildings:', error);
    }
}

function displayBuildings(buildings) {
    const buildingsList = document.getElementById('buildingsList');
    if (!buildingsList) return;
    
    if (buildings.length === 0) {
        buildingsList.innerHTML = '<p>No buildings found</p>';
        return;
    }
    
    buildingsList.innerHTML = buildings.map(building => `
        <div class="item-card">
            <div>
                <strong><i class="fas fa-building"></i> ${building.name}</strong>
                <div>Location: ${building.location}</div>
                <div>Floors: ${building.floors}</div>
            </div>
            <div class="item-actions">
                <button onclick="editBuilding(${building.id})" class="btn-edit"><i class="fas fa-edit"></i></button>
                <button onclick="deleteBuilding(${building.id})" class="btn-delete"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

async function addBuilding(event) {
    event.preventDefault();
    
    const name = document.getElementById('buildingName')?.value;
    const location = document.getElementById('buildingLocation')?.value;
    const floors = parseInt(document.getElementById('buildingFloors')?.value);
    
    if (!name || !location || !floors) return;
    
    try {
        await apiRequest('/api/buildings', 'POST', { name, location, floors });
        loadBuildings();
        if (document.getElementById('buildingForm')) document.getElementById('buildingForm').reset();
    } catch (error) {
        console.error('Error adding building:', error);
        alert('Error adding building: ' + error.message);
    }
}

async function editBuilding(id) {
    const newName = prompt('Enter new building name:');
    const newLocation = prompt('Enter new location:');
    const newFloors = parseInt(prompt('Enter number of floors:'));
    
    if (newName && newLocation && newFloors) {
        try {
            await apiRequest(`/api/buildings/${id}`, 'PUT', { name: newName, location: newLocation, floors: newFloors });
            loadBuildings();
        } catch (error) {
            console.error('Error editing building:', error);
            alert('Error editing building: ' + error.message);
        }
    }
}

async function deleteBuilding(id) {
    if (confirm('Are you sure you want to delete this building?')) {
        try {
            await apiRequest(`/api/buildings/${id}`, 'DELETE');
            loadBuildings();
            loadRooms();
        } catch (error) {
            console.error('Error deleting building:', error);
            alert('Error deleting building: ' + error.message);
        }
    }
}

async function loadRooms() {
    try {
        const rooms = await apiRequest('/api/rooms');
        displayRooms(rooms);
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

function displayRooms(rooms) {
    const roomsList = document.getElementById('roomsList');
    if (!roomsList) return;
    
    if (rooms.length === 0) {
        roomsList.innerHTML = '<p>No rooms found</p>';
        return;
    }
    
    roomsList.innerHTML = rooms.map(room => `
        <div class="item-card">
            <div>
                <strong><i class="fas fa-door-open"></i> Room ${room.room_number}</strong>
                <div>Building: ${room.buildings?.name || 'N/A'}</div>
                <div>Type: ${room.room_type}</div>
                <div>Capacity: ${room.capacity}</div>
            </div>
            <div class="item-actions">
                <button onclick="editRoom(${room.id})" class="btn-edit"><i class="fas fa-edit"></i></button>
                <button onclick="deleteRoom(${room.id})" class="btn-delete"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

async function addRoom(event) {
    event.preventDefault();
    
    const building_id = document.getElementById('roomBuilding')?.value;
    const room_number = document.getElementById('roomNumber')?.value;
    const room_type = document.getElementById('roomType')?.value;
    const capacity = parseInt(document.getElementById('roomCapacity')?.value);
    
    if (!building_id || !room_number || !room_type || !capacity) {
        alert('Please fill all fields');
        return;
    }
    
    try {
        await apiRequest('/api/rooms', 'POST', { building_id, room_number, room_type, capacity });
        loadRooms();
        if (document.getElementById('roomForm')) document.getElementById('roomForm').reset();
    } catch (error) {
        console.error('Error adding room:', error);
        alert('Error adding room: ' + error.message);
    }
}

async function editRoom(id) {
    const newRoomNumber = prompt('Enter new room number:');
    const newRoomType = prompt('Enter room type (lecture/lab/office/conference):');
    const newCapacity = parseInt(prompt('Enter capacity:'));
    
    if (newRoomNumber && newRoomType && newCapacity) {
        try {
            await apiRequest(`/api/rooms/${id}`, 'PUT', { room_number: newRoomNumber, room_type: newRoomType, capacity: newCapacity });
            loadRooms();
        } catch (error) {
            console.error('Error editing room:', error);
            alert('Error editing room: ' + error.message);
        }
    }
}

async function deleteRoom(id) {
    if (confirm('Are you sure you want to delete this room?')) {
        try {
            await apiRequest(`/api/rooms/${id}`, 'DELETE');
            loadRooms();
        } catch (error) {
            console.error('Error deleting room:', error);
            alert('Error deleting room: ' + error.message);
        }
    }
}

async function loadAlertsManagement() {
    try {
        const alerts = await apiRequest('/api/alerts');
        displayAlertsManagement(alerts);
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

function displayAlertsManagement(alerts) {
    const alertsContainer = document.getElementById('alertsManagement');
    if (!alertsContainer) return;
    
    if (alerts.length === 0) {
        alertsContainer.innerHTML = '<p>No alerts found</p>';
        return;
    }
    
    alertsContainer.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.severity}">
            <div class="alert-content">
                <strong><i class="fas fa-exclamation-triangle"></i> ${alert.type}</strong>
                <p>${alert.message}</p>
                <small>Status: ${alert.status} | Room: ${alert.rooms?.room_number || 'N/A'} | ${new Date(alert.timestamp).toLocaleString()}</small>
            </div>
            ${alert.status === 'active' ? `<button onclick="resolveAlertFromAdmin('${alert.id}')" class="btn-resolve"><i class="fas fa-check"></i> Mark Resolved</button>` : ''}
        </div>
    `).join('');
}

async function resolveAlertFromAdmin(alertId) {
    try {
        await apiRequest(`/api/alerts/${alertId}`, 'PUT', { status: 'resolved' });
        loadAlertsManagement();
    } catch (error) {
        console.error('Error resolving alert:', error);
        alert('Error resolving alert: ' + error.message);
    }
}

async function loadAnalytics() {
    await loadTrendChart();
    await loadBuildingChart();
}

async function loadTrendChart() {
    try {
        const trends = await apiRequest('/api/analytics/trends?days=7');
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;
        
        if (trendChart) trendChart.destroy();
        
        trendChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: trends.map(t => t.date),
                datasets: [{
                    label: 'Average Energy Usage (Watts)',
                    data: trends.map(t => t.averageEnergy),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Watts' } } }
            }
        });
    } catch (error) {
        console.error('Error loading trend chart:', error);
    }
}

async function loadBuildingChart() {
    try {
        const buildings = await apiRequest('/api/buildings');
        const readings = await apiRequest('/api/sensor-readings?limit=1000');
        
        const buildingEnergy = {};
        buildings.forEach(building => { buildingEnergy[building.name] = 0; });
        
        readings.forEach(reading => {
            const buildingName = reading.rooms?.buildings?.name;
            if (buildingName && buildingEnergy[buildingName] !== undefined) {
                buildingEnergy[buildingName] += reading.energy_usage;
            }
        });
        
        const ctx = document.getElementById('buildingChart');
        if (!ctx) return;
        
        if (buildingChart) buildingChart.destroy();
        
        buildingChart = new Chart(ctx.getContext('2d'), {
            type: 'pie',
            data: {
                labels: Object.keys(buildingEnergy),
                datasets: [{
                    data: Object.values(buildingEnergy),
                    backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value.toFixed(0)}W (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading building chart:', error);
    }
}

async function generateReport(type) {
    try {
        const trends = await apiRequest(`/api/analytics/trends?days=${type === 'daily' ? 1 : type === 'weekly' ? 7 : 30}`);
        const summary = await apiRequest('/api/analytics/summary');
        const alerts = await apiRequest('/api/alerts');
        
        const activeAlertsCount = alerts.filter(a => a.status === 'active').length;
        const totalEnergyKwh = (summary.totalEnergyToday / 1000).toFixed(2);
        const co2Saved = (totalEnergyKwh * 0.5).toFixed(2);
        
        const reportHtml = `
            <div class="report-content">
                <h4><i class="fas fa-chart-line"></i> ${type.toUpperCase()} Energy Report</h4>
                <p><strong>Period:</strong> ${type === 'daily' ? 'Today' : type === 'weekly' ? 'Last 7 Days' : 'Last 30 Days'}</p>
                <p><strong>Total Energy Consumption:</strong> ${totalEnergyKwh} kWh</p>
                <p><strong>Average Energy Usage:</strong> ${summary.averageEnergyUsage.toFixed(2)} W</p>
                <p><strong>Active Alerts:</strong> ${activeAlertsCount}</p>
                <p><strong>CO₂ Saved:</strong> ${co2Saved} kg</p>
                <hr>
                <h5>Energy Trends:</h5>
                <ul>
                    ${trends.slice(-5).map(t => `<li>${t.date}: ${t.averageEnergy.toFixed(2)} W</li>`).join('')}
                </ul>
                <p><em>Report generated on ${new Date().toLocaleString()}</em></p>
            </div>
        `;
        
        const reportOutput = document.getElementById('reportOutput');
        if (reportOutput) reportOutput.innerHTML = reportHtml;
    } catch (error) {
        console.error('Error generating report:', error);
        const reportOutput = document.getElementById('reportOutput');
        if (reportOutput) reportOutput.innerHTML = '<p class="error">Error generating report. Please try again.</p>';
    }
}