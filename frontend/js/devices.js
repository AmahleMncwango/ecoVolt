(async function () {
    const user = getUser();
    if (!user || user.role !== 'admin') { alert('Admin only'); window.location.href = '/dashboard.html'; return; }
    await loadRooms();
    loadDevices();
})();

let rooms = [];

async function loadRooms() {
    rooms = await apiFetch('/rooms');
    const select = document.getElementById('roomSelect');
    select.innerHTML = rooms.map(r => `<option value="${r.id}">${r.building_name || '?'} - ${r.room_number}</option>`).join('');
}

async function loadDevices() {
    const devices = await apiFetch('/devices');
    const tbody = document.getElementById('devicesList');
    tbody.innerHTML = devices.map(d => `
        <tr><td>${d.room_number}</td><td>${d.device_name}</td><td>${d.device_type || '-'}</td><td>${d.typical_power}</td>
        <td><button onclick="deleteDevice(${d.id})">Delete</button></td></tr>
    `).join('');
}

async function addDevice() {
    const room_id = document.getElementById('roomSelect').value;
    const device_name = document.getElementById('deviceName').value;
    const device_type = document.getElementById('deviceType').value;
    const typical_power = document.getElementById('typicalPower').value;
    if (!device_name) return alert('Name required');
    await apiFetch('/devices', { method: 'POST', body: JSON.stringify({ room_id, device_name, device_type, typical_power }) });
    document.getElementById('deviceName').value = '';
    document.getElementById('deviceType').value = '';
    loadDevices();
}

async function deleteDevice(id) {
    if (confirm('Delete device? All sensor readings will be lost.'))
        await apiFetch(`/devices/${id}`, { method: 'DELETE' });
    loadDevices();
}