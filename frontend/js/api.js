const API_URL = 'http://localhost:5000/api';

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/';
        throw new Error('Session expired');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Enforce role on a page. Pass one or more allowed roles.
function requireRoleOrRedirect(...allowed) {
    const user = getUser();
    if (!user) { window.location.href = '/'; return null; }
    if (!allowed.includes(user.role)) {
        alert(`Access denied. This page is for: ${allowed.join(', ')}`);
        // send them to their own dashboard
        const map = {
            admin: '/admin-dashboard.html',
            maintenance: '/maintenance-dashboard.html',
            management: '/management-dashboard.html'
        };
        window.location.href = map[user.role] || '/';
        return null;
    }
    return user;
}

function renderRoleBadge(user) {
    const el = document.getElementById('roleBadge');
    if (!el || !user) return;
    const labels = {
        admin: '👑 Administrator',
        maintenance: '🔧 Maintenance',
        management: '📊 Management'
    };
    el.textContent = `${labels[user.role] || user.role}${user.full_name ? ' · ' + user.full_name : ''}`;
    el.className = `role-badge ${user.role}`;
}
