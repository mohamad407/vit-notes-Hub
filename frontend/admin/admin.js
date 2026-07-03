document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user_data'));
    if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    // Tab Navigation
    document.querySelectorAll('.admin-sidebar li').forEach(li => {
        li.addEventListener('click', () => {
            document.querySelectorAll('.admin-sidebar li').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.admin-content .tab-content').forEach(t => t.classList.remove('active'));
            li.classList.add('active');
            document.getElementById(`admin-${li.dataset.tab}`).classList.add('active');
        });
    });

    loadAdminStats();
    loadUsers();
    loadAdminNotes();
    loadAdminAnnouncements();
    setupAnnouncementForm();
});

async function loadAdminStats() {
    try {
        const token = localStorage.getItem('vit_token');
        const res = await fetch('https://your-render-backend-url.com/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        document.getElementById('admin-total-users').innerText = data.users || 0;
        document.getElementById('admin-total-notes').innerText = data.notes || 0;
        document.getElementById('admin-total-downloads').innerText = data.downloads || 0;
    } catch (err) { console.error(err); }
}

async function loadUsers() {
    try {
        const token = localStorage.getItem('vit_token');
        const res = await fetch('https://your-render-backend-url.com/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        data.users.forEach(u => {
            tbody.innerHTML += `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td>${u.uploadCount || 0}</td>
                    <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>${new Date(u.lastLogin).toLocaleDateString()}</td>
                </tr>
            `;
        });
    } catch (err) { console.error(err); }
}

async function loadAdminNotes() {
    try {
        const token = localStorage.getItem('vit_token');
        const res = await fetch('https://your-render-backend-url.com/api/admin/notes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const tbody = document.getElementById('notes-table-body');
        tbody.innerHTML = '';
        data.notes.forEach(n => {
            tbody.innerHTML += `
                <tr>
                    <td>${n.courseCode} - ${n.courseName}</td>
                    <td>${n.facultyName}</td>
                    <td>${n.uploadedBy?.name || 'Unknown'}</td>
                    <td>${new Date(n.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-outline action-btn" onclick="deleteNote('${n._id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (err) { console.error(err); }
}

window.deleteNote = async function(id) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
        const token = localStorage.getItem('vit_token');
        await fetch(`https://your-render-backend-url.com/api/notes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        showToast('Note deleted successfully.', 'success');
        loadAdminNotes();
    } catch (err) {
        showToast('Failed to delete note.', 'error');
    }
};

async function loadAdminAnnouncements() {
    try {
        const token = localStorage.getItem('vit_token');
        const res = await fetch('https://your-render-backend-url.com/api/announcements', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const list = document.getElementById('admin-announcements-list');
        list.innerHTML = '';
        data.announcements.forEach(a => {
            list.innerHTML += `
                <div class="announcement-item glass">
                    <span>${a.text}</span>
                    <div>
                        <button class="btn btn-outline action-btn" onclick="deleteAnnouncement('${a._id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
    } catch (err) { console.error(err); }
}

function setupAnnouncementForm() {
    document.getElementById('announcement-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('announcement-input');
        try {
            const token = localStorage.getItem('vit_token');
            await fetch('https://your-render-backend-url.com/api/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ text: input.value })
            });
            input.value = '';
            showToast('Announcement published!', 'success');
            loadAdminAnnouncements();
        } catch (err) {
            showToast('Failed to publish announcement.', 'error');
        }
    });
}

window.deleteAnnouncement = async function(id) {
    if (!confirm('Delete this announcement?')) return;
    try {
        const token = localStorage.getItem('vit_token');
        await fetch(`https://your-render-backend-url.com/api/announcements/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        showToast('Announcement deleted.', 'success');
        loadAdminAnnouncements();
    } catch (err) {
        showToast('Failed to delete announcement.', 'error');
    }
};
