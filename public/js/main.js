document.addEventListener('DOMContentLoaded', async () => {
    await loadStats();
    await loadBuildingsCount();
    await loadLiveDataDemo();
    
    window.addEventListener('sensorUpdate', (event) => {
        updateLiveDemo(event.detail);
    });
});

async function loadStats() {
    try {
        const summary = await apiRequest('/api/analytics/summary');
        const totalEnergyKwh = (summary.totalEnergyToday / 1000).toFixed(2);
        const co2Saved = (totalEnergyKwh * 0.5).toFixed(2);
        
        const totalEnergyEl = document.getElementById('totalEnergy');
        const activeAlertsEl = document.getElementById('activeAlerts');
        const co2SavedEl = document.getElementById('co2Saved');
        
        if (totalEnergyEl) totalEnergyEl.textContent = totalEnergyKwh;
        if (activeAlertsEl) activeAlertsEl.textContent = summary.activeAlerts;
        if (co2SavedEl) co2SavedEl.textContent = co2Saved;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadBuildingsCount() {
    try {
        const buildings = await apiRequest('/api/buildings');
        const totalBuildingsEl = document.getElementById('totalBuildings');
        if (totalBuildingsEl) totalBuildingsEl.textContent = buildings.length;
    } catch (error) {
        console.error('Error loading buildings:', error);
    }
}

async function loadLiveDataDemo() {
    const demoContainer = document.getElementById('liveDataDemo');
    if (demoContainer) {
        demoContainer.innerHTML = '<div class="demo-loading"><i class="fas fa-spinner fa-spin"></i><p>Waiting for sensor data...</p></div>';
    }
}

function updateLiveDemo(sensorData) {
    const demoContainer = document.getElementById('liveDataDemo');
    if (!demoContainer) return;
    
    let demoCard = document.querySelector('.demo-card');
    if (!demoCard) {
        demoContainer.innerHTML = '';
        demoCard = document.createElement('div');
        demoCard.className = 'demo-card';
        demoContainer.appendChild(demoCard);
    }
    
    const energyWatts = sensorData.energyUsage;
    const status = sensorData.isOccupied ? 'Occupied' : 'Empty';
    const statusClass = sensorData.isOccupied ? 'status-occupied' : 'status-empty';
    
    demoCard.innerHTML = `
        <div class="demo-header">
            <i class="fas fa-microchip"></i>
            <h3>Room ${sensorData.roomId}</h3>
        </div>
        <div class="demo-data">
            <div class="demo-item">
                <i class="fas fa-bolt"></i>
                <span>Energy: <strong>${energyWatts}W</strong></span>
            </div>
            <div class="demo-item">
                <i class="fas fa-users"></i>
                <span>Status: <strong class="${statusClass}">${status}</strong></span>
            </div>
            <div class="demo-item">
                <i class="fas fa-clock"></i>
                <span>Updated: ${new Date(sensorData.timestamp).toLocaleTimeString()}</span>
            </div>
        </div>
        ${sensorData.alert ? '<div class="demo-alert"><i class="fas fa-exclamation-triangle"></i> Energy Waste Detected!</div>' : ''}
    `;
}