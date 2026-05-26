const socket = io();

let currentUser = null;

// Check authentication on page load
function checkAuth() {
    const savedUser = localStorage.getItem('ecovolt_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedInUser();
        return true;
    }
    return false;
}

// Call this on pages that require authentication
function requireAuth() {
    const isLoggedIn = checkAuth();
    if (!isLoggedIn && window.location.pathname !== '/login.html' && window.location.pathname !== '/index.html') {
        window.location.href = '/login.html';
    }
}

socket.on('connect', () => {
    console.log('Connected to EcoVolt server');
});

socket.on('sensor-data', (data) => {
    console.log('Sensor data received:', data);
    if (window.updateSensorData) {
        window.updateSensorData(data);
    }
    window.dispatchEvent(new CustomEvent('sensorUpdate', { detail: data }));
});

socket.on('new-alert', (alert) => {
    console.log('New alert:', alert);
    if (Notification.permission === 'granted') {
        new Notification('EcoVolt Alert', {
            body: alert.message,
            icon: '/favicon.ico'
        });
    }
    window.dispatchEvent(new CustomEvent('newAlert', { detail: alert }));
});

if (Notification.permission === 'default') {
    Notification.requestPermission();
}

function updateUIForLoggedInUser() {
    if (currentUser) {
        const authButtons = document.getElementById('authButtons');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        if (userName) userName.textContent = currentUser.name;
    }
}

function logout() {
    localStorage.removeItem('ecovolt_user');
    currentUser = null;
    window.location.href = '/login.html';
}

async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) options.body = JSON.stringify(data);
    
    const response = await fetch(endpoint, options);
    const result = await response.json();
    
    if (!response.ok) throw new Error(result.error || 'API request failed');
    return result;
}

// Check auth on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Protect dashboard and admin pages
    if (window.location.pathname.includes('dashboard.html') || 
        window.location.pathname.includes('admin.html')) {
        requireAuth();
    }
});