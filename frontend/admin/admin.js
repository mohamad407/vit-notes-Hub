/* ============================================================
   VITNotes Hub - Admin Panel Logic
   ============================================================ */

const CONFIG = {
  API_URL: 'https://your-backend.onrender.com', // <-- REPLACE
  const firebaseConfig = {
  apiKey: "AIzaSyAeDQuBuxUKpOt_5VzuNdPsEpJYKmhPEKY",
  authDomain: "vit-note-hub.firebaseapp.com",
  projectId: "vit-note-hub",
  storageBucket: "vit-note-hub.firebasestorage.app",
  messagingSenderId: "337330202314",
  appId: "1:337330202314:web:64b326c38fc41da959f633",
  measurementId: "G-LZ5CGW6BW8"
};
};

firebase.initializeApp(CONFIG.FIREBASE);
const auth = firebase.auth();

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let state = { user: null, idToken: null };

// ---------- AUTH GUARD ----------
const requireAdmin = async () => {
  return new Promise((resolve) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = 'index.html';
        return;
      }
      if (!user.email.endsWith('@vitstudent.ac.in')) {
        alert('Access denied');
        await auth.signOut();
        window.location.href = 'index.html';
        return;
      }
      try {
        state.idToken = await user.getIdToken();
        const res = await api('/api/auth/me');
        if (res.user.role !== 'admin') {
          alert('Admin access required');
          window.location.href = 'index.html';
          return;
        }
        state.user = res.user;
        $('#adminName').textContent = res.user.name;
        $('#adminEmail').textContent = res.user.email;
        $('#adminAvatar').src = res.user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(res.user.name)}`;
        resolve();
      } catch (err) {
        window.location.href = 'index.html';
      }
    });
  });
};

// ---------- API ----------
const api = async (endpoint, options = {}) => {
  const headers = { ...(options.headers || {}) };
  if (state.idToken) headers.Authorization = `Bearer ${state.idToken}`;
  if (!(options.body instanceof FormData) && options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(`${CONFIG.API_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

const toast = (msg, type = 'info') => {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('#toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3500);
};

// ---------- VIEWS ----------
const switchView = (viewName) => {
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $(`#${viewName}View`).classList.add('active');
  $(`.nav-item[data-view="${viewName}"]`).classList.add('active');
  $('#pageTitle').textContent = {
    dashboard: 'Dashboard',
    notes: 'Manage Notes',
    users: 'Users'
  }[viewName];

  if (viewName === 'dashboard') loadDashboard();
  if (viewName === 'notes') loadNotesAdmin();
  if (viewName === 'users') loadUsers();
};

// ---------- DASHBOARD ----------
const loadDashboard = async () => {
  try {
    const res = await api('/api/admin/stats');
    $('#totalNotes').textContent = res.stats.totalNotes;
    $('#totalUsers').textContent = res.stats.totalUsers;
    $('#pendingNotes').textContent = res.stats.pendingNotes;
    $('#totalViews').textContent = res.stats.totalViews.toLocaleString();

    const notesRes = await api('/api/admin/notes');
    const recent = notesRes.notes.slice(0, 5);
    $('#recentNotesBody').innerHTML = recent.map(n => `
      <tr>
        <td><strong>${escapeHtml(n.title)}</strong></td>
        <td>${escapeHtml(n.subject)}</td>
        <td>${n.branch}</td>
        <td>${escapeHtml(n.uploadedBy?.name || 'Unknown')}</td>
        <td>${n.views}</td>
        <td>${formatDate(n.createdAt)}</td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No notes yet</td></tr>';
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ---------- NOTES ----------
const loadNotesAdmin = async () => {
  const status = $('#noteStatusFilter').value;
  try {
    const res = await api(`/api/admin/notes${status ? `?status=${status}` : ''}`);
    $('#notesTableBody').innerHTML = res.notes.map(n => `
      <tr>
        <td><strong>${escapeHtml(n.title)}</strong></td>
        <td>${escapeHtml(n.subject)}</td>
        <td>${n.semester}</td>
        <td>${n.branch}</td>
        <td>${escapeHtml(n.uploadedBy?.name || 'Unknown')}</td>
        <td>${n.views}</td>
        <td><span class="status-badge status-${n.status}">${n.status}</span></td>
        <td>
          <button class="action-btn" onclick="changeStatus('${n._id}','approved')">✓</button>
          <button class="action-btn" onclick="changeStatus('${n._id}','rejected')">✗</button>
          <button class="action-btn danger" onclick="deleteNote('${n._id}')">🗑</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">No notes</td></tr>';
  } catch (err) {
    toast(err.message, 'error');
  }
};

window.changeStatus = async (id, status) => {
  if (!confirm(`Mark as ${status}?`)) return;
  try {
    await api(`/api/admin/notes/${id}/status`, { method: 'PUT', body: { status } });
    toast(`Note ${status}`, 'success');
    loadNotesAdmin();
    loadDashboard();
  } catch (err) {
    toast(err.message, 'error');
  }
};

window.deleteNote = async (id) => {
  if (!confirm('Delete this note permanently?')) return;
  try {
    await api(`/api/admin/notes/${id}`, { method: 'DELETE' });
    toast('Note deleted', 'success');
    loadNotesAdmin();
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ---------- USERS ----------
const loadUsers = async () => {
  try {
    const res = await api('/api/admin/users');
    $('#usersTableBody').innerHTML = res.users.map(u => `
      <tr>
        <td><strong>${escapeHtml(u.name)}</strong></td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="status-badge role-${u.role}">${u.role}</span></td>
        <td>${u.notesUploaded || 0}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td>
          ${u.role === 'student'
            ? `<button class="action-btn" onclick="changeRole('${u._id}','admin')">Make Admin</button>`
            : `<button class="action-btn" onclick="changeRole('${u._id}','student')">Make Student</button>`}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    toast(err.message, 'error');
  }
};

window.changeRole = async (id, role) => {
  if (!confirm(`Change role to ${role}?`)) return;
  try {
    await api(`/api/admin/users/${id}/role`, { method: 'PUT', body: { role } });
    toast(`Role updated to ${role}`, 'success');
    loadUsers();
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ---------- HELPERS ----------
const escapeHtml = (s) => s ? String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) : '';
const formatDate = (d) => new Date(d).toLocaleDateString();

const updateTime = () => {
  $('#currentTime').textContent = new Date().toLocaleString();
};

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', async () => {
  await requireAdmin();

  $$('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });

  $('#noteStatusFilter').addEventListener('change', loadNotesAdmin);
  $('#logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    window.location.href = 'index.html';
  });

  updateTime();
  setInterval(updateTime, 1000);
  loadDashboard();
});
