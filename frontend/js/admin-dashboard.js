let chart;

(async function init() {
    const user = requireRoleOrRedirect('admin');
    if (!user) return;
    renderRoleBadge(user);
    await loadAll();
    setInterval(loadAll, 20000);
})();

async function loadAll() {
    try {
        const [readings, pred, alerts, summary] = await Promise.all([
            apiFetch('/sensor-readings?limit=30'),
            apiFetch('/analytics/predict'),
            apiFetch('/alerts?unresolved=true'),
            apiFetch('/analytics/summary').catch(() => [])
        ]);

        // Stat tiles
        const totalDevices = summary.reduce((s, b) => s + (b.total_devices || 0), 0);
        const avgPower = readings.length
            ? (readings.reduce((s, r) => s + Number(r.power_consumption), 0) / readings.length).toFixed(1)
            : '0';
        document.getElementById('statGrid').innerHTML = `
            <div class="stat"><div class="label">Buildings</div><div class="value">${summary.length}</div></div>
            <div class="stat"><div class="label">Devices</div><div class="value">${totalDevices}</div></div>
            <div class="stat"><div class="label">Active Alerts</div><div class="value">${alerts.length}</div></div>
            <div class="stat"><div class="label">Avg Power (W)</div><div class="value">${avgPower}</div></div>
        `;

        // Chart
        if (readings.length) {
            const labels = readings.map(r => new Date(r.recorded_at).toLocaleTimeString()).reverse();
            const data = readings.map(r => r.power_consumption).reverse();
            if (chart) chart.destroy();
            const ctx = document.getElementById('energyChart').getContext('2d');
            chart = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets: [{
                    label: 'Watts', data,
                    borderColor: '#1f9d44', backgroundColor: 'rgba(47,191,87,0.15)',
                    fill: true, tension: 0.35
                }]},
                options: { plugins: { legend: { display: false } } }
            });
        }

        // AI
        const predDiv = document.getElementById('aiPrediction');
        if (pred && pred.prediction !== null && pred.prediction !== undefined) {
            predDiv.innerHTML = `
                <p>📈 ${pred.message}</p>
                <p>📊 Average: <b>${pred.averagePower} W</b></p>
                <p>🎯 Confidence: <b>${pred.confidence}</b></p>
            `;
        } else {
            predDiv.innerHTML = '<p>⏳ Collecting more sensor data...</p>';
        }

        // Alerts (admin can resolve & delete)
        const alertsDiv = document.getElementById('alertsList');
        if (!alerts.length) {
            alertsDiv.innerHTML = '<p>✅ No active alerts.</p>';
        } else {
            alertsDiv.innerHTML = alerts.map(a => `
                <div class="alert-item">
                    <strong>⚠️ ${a.building_name} — Room ${a.room_number}</strong><br>
                    ${a.message}<br>
                    <small>${new Date(a.created_at).toLocaleString()}</small><br>
                    <button class="resolve-btn" onclick="resolveAlert(${a.id})">Resolve</button>
                    <button class="resolve-btn danger" onclick="deleteAlert(${a.id})">Delete</button>
                </div>
            `).join('');
        }

        // Summary table
        const tbody = document.getElementById('summaryBody');
        tbody.innerHTML = summary.map(b => `
            <tr>
                <td>${b.building_name}</td>
                <td>${b.total_devices || 0}</td>
                <td>${b.avg_power ? Number(b.avg_power).toFixed(1) : '-'}</td>
                <td>${b.active_alerts || 0}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Dashboard load error', err);
    }
}

async function resolveAlert(id) {
    await apiFetch(`/alerts/${id}/resolve`, { method: 'PUT' });
    loadAll();
}
async function deleteAlert(id) {
    if (!confirm('Delete this alert?')) return;
    await apiFetch(`/alerts/${id}`, { method: 'DELETE' });
    loadAll();
}
