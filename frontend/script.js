document.addEventListener('DOMContentLoaded', () => {
    // Generate particles
    createParticles();
    
    // Check auth state to enable search
    firebase.auth().onAuthStateChanged((user) => {
        const searchInput = document.getElementById('hero-search');
        const searchBtn = document.querySelector('.search-container .btn');
        const searchHint = document.getElementById('search-hint');

        if (user) {
            searchInput.disabled = false;
            searchBtn.disabled = false;
            searchHint.innerHTML = '<i class="fas fa-check-circle"></i> Signed in as ' + user.email;
            searchHint.style.color = 'var(--success)';
        }
    });

    // Fetch Announcements (only show if exists)
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

    // Login Modal
    const loginBtn = document.getElementById('login-btn');
    const loginModal = document.getElementById('login-modal');
    const closeModal = document.getElementById('close-modal');
    const googleLoginBtn = document.getElementById('google-login-btn');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            loginModal.classList.remove('hidden');
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            loginModal.classList.add('hidden');
        });
    }

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({
                hd: 'vitstudent.ac.in',
                prompt: 'select_account'
            });
            
            firebase.auth().signInWithPopup(provider).catch((error) => {
                if (error.code !== 'auth/popup-closed-by-user') {
                    showToast('Login failed. Please ensure you are using a VIT email.', 'error');
                }
            });
        });
    }

    // Close modal on overlay click
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                loginModal.classList.add('hidden');
            }
        });
    }
});

// Create floating particles
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

async function fetchAnnouncements() {
    try {
        const res = await fetch('https://your-render-backend-url.com/api/announcements/latest');
        const data = await res.json();
        if (data && data.text) {
            const bar = document.getElementById('announcement-bar');
            document.getElementById('announcement-text').innerText = data.text;
            bar.classList.remove('hidden');
        }
    } catch (err) { 
        console.error('Error fetching announcements:', err);
        // Don't show announcement bar if no data
    }
}

async function fetchLatestNotes() {
    try {
        const res = await fetch('https://your-render-backend-url.com/api/notes?limit=3');
        const data = await res.json();
        const grid = document.getElementById('latest-notes-grid');
        grid.innerHTML = '';
        
        if (data.notes && data.notes.length > 0) {
            data.notes.forEach((note, index) => {
                const card = document.createElement('div');
                card.className = 'note-card glass fade-in';
                card.style.animationDelay = `${index * 0.1}s`;
                card.innerHTML = `
                    <div class="note-card-header">
                        <h4>${note.courseName}</h4>
                        <span class="badge">${note.courseCode}</span>
                    </div>
                    <p><i class="fas fa-user"></i> ${note.facultyName}</p>
                    <div class="note-card-footer">
                        <span><i class="fas fa-folder"></i> ${note.department}</span>
                        <span><i class="fas fa-download"></i> ${note.downloads || 0}</span>
                    </div>
                `;
                grid.appendChild(card);
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

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
