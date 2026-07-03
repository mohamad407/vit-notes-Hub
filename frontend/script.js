document.addEventListener('DOMContentLoaded', () => {
    // Check auth state to enable search
    firebase.auth().onAuthStateChanged((user) => {
        const searchInput = document.getElementById('hero-search');
        const searchBtn = document.querySelector('.search-container .btn');
        const searchHint = document.getElementById('search-hint');

        if (user) {
            searchInput.disabled = false;
            searchBtn.disabled = false;
            searchHint.style.display = 'none';
            searchInput.placeholder = "Search for courses, faculty, or subjects...";
        }
    });

    // Fetch Announcements
    fetchAnnouncements();

    // Fetch Latest Notes
    fetchLatestNotes();

    // Fetch Stats
    fetchStats();

    // Close announcement
    const closeBtn = document.getElementById('close-announcement');
    if(closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('announcement-bar').classList.add('hidden');
        });
    }
});

async function fetchAnnouncements() {
    try {
        const res = await fetch('https://your-render-backend-url.com/api/announcements/latest');
        const data = await res.json();
        if (data && data.text) {
            const bar = document.getElementById('announcement-bar');
            document.getElementById('announcement-text').innerText = data.text;
            bar.classList.remove('hidden');
        }
    } catch (err) { console.error('Error fetching announcements:', err); }
}

async function fetchLatestNotes() {
    try {
        const res = await fetch('https://your-render-backend-url.com/api/notes?limit=3');
        const data = await res.json();
        const grid = document.getElementById('latest-notes-grid');
        grid.innerHTML = '';
        
        if (data.notes && data.notes.length > 0) {
            data.notes.forEach(note => {
                grid.innerHTML += `
                    <div class="note-card glass fade-in">
                        <div class="note-card-header">
                            <h4>${note.courseName}</h4>
                            <span class="badge">${note.courseCode}</span>
                        </div>
                        <p><i class="fas fa-user"></i> ${note.facultyName}</p>
                        <div class="note-card-footer">
                            <span><i class="fas fa-folder"></i> ${note.department}</span>
                            <span><i class="fas fa-download"></i> ${note.downloads || 0}</span>
                        </div>
                    </div>
                `;
            });
        } else {
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:var(--text-secondary);">No notes uploaded yet. Be the first!</p>';
        }
    } catch (err) {
        console.error('Error fetching notes:', err);
        document.getElementById('latest-notes-grid').innerHTML = '<p style="text-align:center; grid-column:1/-1;">Failed to load notes.</p>';
    }
}

async function fetchStats() {
    try {
        const res = await fetch('https://your-render-backend-url.com/api/stats/public');
        const data = await res.json();
        document.getElementById('stat-users').innerText = data.users || 0;
        document.getElementById('stat-notes').innerText = data.notes || 0;
        document.getElementById('stat-downloads').innerText = data.downloads || 0;
    } catch (err) { console.error('Error fetching stats:', err); }
}
