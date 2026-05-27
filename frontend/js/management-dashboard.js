let buildingChart;

(async function init() {
    const user = requireRoleOrRedirect('management');
    if (!user) return;
    renderRoleBadge(user);
    await loadAll();
    setInterval(loadAll, 30000);
})();

async function loadAll() {
    try {
        const [summary, pred, alerts] = await Promise.all([
            apiFetch('/analytics/summary').catch(() => []),
            apiFetch('/analytics/predict'),
            apiFetch('/alerts?unresolved=true')
        ]);

        const totalDevices = summary.reduce((s, b) => s + (Number(b.total_devices) || 0), 0);
        const totalPower = summary.reduce((s, b) => s + (Number(b.total_power) || 0), 0);
        const avg = summary.length
            ? (summary.reduce((s, b) => s + (Number(b.avg_power) || 0), 0) / summary.length).toFixed(1)
            : '0';

        document.getElementById('statGrid').innerHTML = `
            <div class="stat"><div class="label">Buildings</div><div class="value">${summary.length}</div></div>
            <div class="stat"><div class="label">Devices Tracked</div><div class="value">${totalDevices}</div></div>
            <div class="stat"><div class="label">Avg Power (W)</div><div class="value">${avg}</div></div>
            <div class="stat"><div class="label">Open Alerts</div><div class="value">${alerts.length}</div></div>
        `;

        // Chart: avg power per building
        const labels = summary.map(b => b.building_name);
        const data = summary.map(b => Number(b.avg_power) || 0);
        if (buildingChart) buildingChart.destroy();
        const ctx = document.getElementById('buildingChart').getContext('2d');
        buildingChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{
                label: 'Avg Watts', data,
                backgroundColor: '#2fbf57', borderRadius: 6
            }]},
            options: { plugins: { legend: { display: false } } }
        });

        // AI prediction (read-only)
        const predDiv = document.getElementById('aiPrediction');
        if (pred && pred.prediction !== null && pred.prediction !== undefined) {
            predDiv.innerHTML = `
                <p>📈 ${pred.message}</p>
                <p>📊 Campus Average: <b>${pred.averagePower} W</b></p>
                <p>📐 Trend: <b>${pred.trend}</b></p>
                <p>🎯 Confidence: <b>${pred.confidence}</b></p>
            `;
        } else {
            predDiv.innerHTML = '<p>⏳ Insufficient data for prediction.</p>';
        }

        // Sustainability narrative (estimated)
        // Rough: total_power Watts * 24h * 30d / 1000 = kWh/month, R2.20 / kWh ZA average.
        const monthlyKWh = (totalPower * 24 * 30) / 1000;
        const monthlyCost = monthlyKWh * 2.2;
        const co2Kg = monthlyKWh * 0.9; // ~0.9 kg CO2 per kWh (ZA grid)
        document.getElementById('sustainability').innerHTML = `
            <div class="stat-grid">
                <div class="stat"><div class="label">Est. Monthly Usage</div><div class="value">${monthlyKWh.toFixed(0)} kWh</div></div>
                <div class="stat"><div class="label">Est. Monthly Cost</div><div class="value">R ${monthlyCost.toFixed(0)}</div></div>
                <div class="stat"><div class="label">Est. CO₂ / month</div><div class="value">${co2Kg.toFixed(0)} kg</div></div>
            </div>
            <p style="margin-top:1rem;color:#0e3d22;">
                Insights for sustainability planning, budget projection and load-shedding mitigation.
                Reduce open alerts to lower wastage.
            </p>
        `;

        document.getElementById('summaryBody').innerHTML = summary.map(b => `
            <tr>
                <td>${b.building_name}</td>
                <td>${b.total_devices || 0}</td>
                <td>${b.avg_power ? Number(b.avg_power).toFixed(1) : '-'}</td>
                <td>${b.total_power ? Number(b.total_power).toFixed(1) : '-'}</td>
                <td>${b.active_alerts || 0}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}
