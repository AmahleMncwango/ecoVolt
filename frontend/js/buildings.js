(async function () {
    const user = getUser();
    if (!user || user.role !== 'admin') {
        alert('Admin access required');
        window.location.href = '/dashboard.html';
        return;
    }
    loadBuildings();
})();

async function loadBuildings() {
    const buildings = await apiFetch('/buildings');
    const tbody = document.getElementById('buildingsList');
    tbody.innerHTML = buildings.map(b => `
        <tr>
            <td>${b.name}</td>
            <td>${b.location || '-'}</td>
            <td><button onclick="deleteBuilding(${b.id})">Delete</button></td>
        </tr>
    `).join('');
}

async function addBuilding() {
    const name = document.getElementById('buildingName').value;
    const location = document.getElementById('buildingLocation').value;
    if (!name) return alert('Name required');
    await apiFetch('/buildings', { method: 'POST', body: JSON.stringify({ name, location }) });
    document.getElementById('buildingName').value = '';
    document.getElementById('buildingLocation').value = '';
    loadBuildings();
}

async function deleteBuilding(id) {
    if (confirm('Delete building? All rooms/devices will be lost.')) {
        await apiFetch(`/buildings/${id}`, { method: 'DELETE' });
        loadBuildings();
    }
}