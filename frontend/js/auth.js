const API_BASE = 'http://localhost:5000/api/auth';

function showTab(tab) {
    const loginDiv = document.getElementById('login-form');
    const regDiv = document.getElementById('register-form');
    const btns = document.querySelectorAll('.tab-btn');
    if (tab === 'login') {
        loginDiv.style.display = 'block';
        regDiv.style.display = 'none';
        btns[0].classList.add('active');
        btns[1].classList.remove('active');
    } else {
        loginDiv.style.display = 'none';
        regDiv.style.display = 'block';
        btns[0].classList.remove('active');
        btns[1].classList.add('active');
    }
}

function showMsg(id, text, type) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = `message show ${type}`;
}

// Where to send each role after login
function dashboardFor(role) {
    switch (role) {
        case 'admin':       return '/admin-dashboard.html';
        case 'maintenance': return '/maintenance-dashboard.html';
        case 'management':  return '/management-dashboard.html';
        default:            return '/';
    }
}

async function register() {
    const full_name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;

    if (!full_name || !email || !password) {
        return showMsg('register-message', 'All fields are required', 'error');
    }
    if (password.length < 6) {
        return showMsg('register-message', 'Password must be at least 6 characters', 'error');
    }

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role, full_name })
        });
        const data = await res.json();
        if (res.ok) {
            showMsg('register-message', '✅ Registered! Please login.', 'success');
            setTimeout(() => showTab('login'), 1400);
        } else {
            showMsg('register-message', data.error || 'Registration failed', 'error');
        }
    } catch {
        showMsg('register-message', 'Network error. Is the backend running?', 'error');
    }
}

async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const role = document.getElementById('login-role').value;

    if (!email || !password) {
        return showMsg('login-message', 'Email and password required', 'error');
    }

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = dashboardFor(data.user.role);
        } else {
            showMsg('login-message', data.error || 'Invalid credentials', 'error');
        }
    } catch {
        showMsg('login-message', 'Network error', 'error');
    }
}
