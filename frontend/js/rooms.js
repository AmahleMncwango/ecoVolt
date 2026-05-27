let buildings = [];

(async function () {
    const user = getUser();
    if (!user || user.role !== 'admin') { alert('Admin only'); window.location.href = '/dashboard.html'; return; }
    await loadBuildings();
    loadRooms();
})();

async function loadBuildings() {
    buildings = await apiFetch('/buildings');
    const select = document.getElementById('buildingId');
    select.innerHTML = buildings.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
}

async function loadRooms() {
    const rooms = await apiFetch('/rooms');
    const bMap = Object.fromEntries(buildings.map(b => [b.id, b.name]));
    const tbody = document.getElementById('roomsList');
    tbody.innerHTML = rooms.map(r => `
        <tr><td>${bMap[r.building_id]}</td><td>${r.room_number}</td><td>${r.threshold_watt}</td>
        <td><button onclick="deleteRoom(${r.id})">Delete</button></td></tr>
    `).join('');
}

async function addRoom() {
    const building_id = document.getElementById('buildingId').value;
    const room_number = document.getElementById('roomNumber').value;
    const threshold_watt = document.getElementById('thresholdWatt').value;
    if (!room_number) return alert('Room number required');
    await apiFetch('/rooms', { method: 'POST', body: JSON.stringify({ building_id, room_number, threshold_watt }) });
    document.getElementById('roomNumber').value = '';
    loadRooms();
}

async function deleteRoom(id) {
    if (confirm('Delete room? All devices and readings will be lost.'))
        await apiFetch(`/rooms/${id}`, { method: 'DELETE' });
    loadRooms();
}