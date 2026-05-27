(async function init() {
    const user = requireRoleOrRedirect('maintenance');
    if (!user) return;
    renderRoleBadge(user);
    await loadAll();
    setInterval(loadAll, 15000);
})();

async function loadAll() {
    try {
        const [active, all, readings] = await Promise.all([
            apiFetch('/alerts?unresolved=true'),
            apiFetch('/alerts'),
            apiFetch('/sensor-readings?limit=20')
        ]);

        const resolved = all.filter(a => a.resolved).slice(0, 10);

        document.getElementById('statGrid').innerHTML = `
            <div class="stat"><div class="label">Active Alerts</div><div class="value">${active.length}</div></div>
            <div class="stat"><div class="label">Resolved Total</div><div class="value">${all.length - active.length}</div></div>
            <div class="stat"><div class="label">Total Logged</div><div class="value">${all.length}</div></div>
        `;

        // Active alerts (with resolve button)
        const activeDiv = document.getElementById('alertsList');
        if (!active.length) {
            activeDiv.innerHTML = '<p>✅ All clear. No active alerts.</p>';
        } else {
            activeDiv.innerHTML = active.map(a => `
                <div class="alert-item ${a.severity === 'critical' ? 'critical' : ''}">
                    <strong>⚠️ ${a.building_name} — Room ${a.room_number}</strong><br>
                    ${a.message}<br>
                    <small>Reported: ${new Date(a.created_at).toLocaleString()}</small><br>
                    <button class="resolve-btn" onclick="resolveAlert(${a.id})">Mark as Resolved</button>
                </div>
            `).join('');
        }

        // Resolved
        const resDiv = document.getElementById('resolvedList');
        resDiv.innerHTML = resolved.length
            ? resolved.map(a => `
                <div class="alert-item" style="background:#e8f5e9;border-left-color:#2fbf57;">
                    <strong>✅ ${a.building_name} — Room ${a.room_number}</strong><br>
                    ${a.message}<br><small>${new Date(a.created_at).toLocaleString()}</small>
                </div>`).join('')
            : '<p>No resolved alerts yet.</p>';

        // Readings
        document.getElementById('readingsBody').innerHTML = readings.map(r => `
            <tr>
                <td>${new Date(r.recorded_at).toLocaleTimeString()}</td>
                <td>${r.building_name}</td>
                <td>${r.room_number}</td>
                <td>${r.device_name}</td>
                <td>${r.occupancy ? 'Yes' : 'No'}</td>
                <td>${Number(r.power_consumption).toFixed(1)}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function resolveAlert(id) {
    try {
        await apiFetch(`/alerts/${id}/resolve`, { method: 'PUT' });
        loadAll();
    } catch (e) { alert(e.message); }
}
