document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user_data'));
    if (!user) return;

    // Update UI with user data
    document.getElementById('user-name').innerText = user.name;
    document.getElementById('user-avatar').src = user.photo;

    // Tab Navigation
    document.querySelectorAll('.sidebar li').forEach(li => {
        li.addEventListener('click', () => {
            document.querySelectorAll('.sidebar li').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            li.classList.add('active');
            document.getElementById(`tab-${li.dataset.tab}`).classList.add('active');
            
            if (li.dataset.tab === 'history') loadHistory();
            if (li.dataset.tab === 'browse') loadNotes();
            if (li.dataset.tab === 'upload') setupUploadForm();
        });
    });

    // Initial Load
    loadNotes();

    // Quick Upload Button
    const quickUploadBtn = document.getElementById('quick-upload-btn');
    if (quickUploadBtn) {
        quickUploadBtn.addEventListener('click', () => {
            document.querySelectorAll('.sidebar li').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelector('[data-tab="upload"]').classList.add('active');
            document.getElementById('tab-upload').classList.add('active');
            setupUploadForm();
        });
    }
});

// --- Browse & Search ---
let currentPage = 1;
const debounce = (func, delay) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => func(...args), delay); }; };

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    const debouncedSearch = debounce((val) => { currentPage = 1; loadNotes(val); }, 500);
    searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
}

async function loadNotes(query = '') {
    const grid = document.getElementById('notes-grid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';
    
    try {
        const API_URL = 'https://vit-notes-hub.onrender.com';
        const token = localStorage.getItem('vit_token');
        const res = await fetch(`${API_URL}/api/notes?page=${currentPage}&limit=9&search=${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        grid.innerHTML = '';
        if (data.notes && data.notes.length > 0) {
            data.notes.forEach(note => {
                const card = document.createElement('div');
                card.className = 'note-card glass fade-in';
                card.innerHTML = `
                    <div class="note-card-header"><h4>${note.courseName}</h4><span class="badge">${note.courseCode}</span></div>
                    <p><i class="fas fa-user"></i> ${note.facultyName}</p>
                    <div class="note-card-footer">
                        <span><i class="fas fa-folder"></i> ${note.department}</span>
                        <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openPDF('${note._id}', '${note.pdfUrl}', '${note.courseName}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                `;
                grid.appendChild(card);
            });
        } else {
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:var(--text-secondary);">No notes found.</p>';
        }
    } catch (err) {
        console.error(err);
        showToast('Failed to load notes.', 'error');
    }
}

async function loadHistory() {
    const grid = document.getElementById('history-grid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="skeleton-card"></div>';
    try {
        const API_URL = 'https://vit-notes-hub.onrender.com';
        const token = localStorage.getItem('vit_token');
        const res = await fetch(`${API_URL}/api/notes/my-uploads`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        grid.innerHTML = '';
        if (data.notes && data.notes.length > 0) {
            data.notes.forEach(note => {
                grid.innerHTML += `
                    <div class="note-card glass fade-in">
                        <div class="note-card-header"><h4>${note.courseName}</h4><span class="badge">${note.courseCode}</span></div>
                        <p>${note.description || 'No description'}</p>
                        <div class="note-card-footer">
                            <span>${new Date(note.createdAt).toLocaleDateString()}</span>
                            <button class="btn btn-outline" onclick="openPDF('${note._id}', '${note.pdfUrl}', '${note.courseName}')"><i class="fas fa-eye"></i> View</button>
                        </div>
                    </div>
                `;
            });
        } else {
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:var(--text-secondary);">You haven\'t uploaded any notes yet.</p>';
        }
    } catch (err) { 
        console.error(err);
        showToast('Failed to load upload history.', 'error');
    }
}

// --- Upload Workflow ---
function setupUploadForm() {
    // Only setup if form exists
    const form = document.getElementById('upload-form');
    if (!form) {
        console.log('Upload form not found - not on upload tab');
        return;
    }

    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('pdf-file');
    const fileInfo = document.getElementById('file-info');
    let selectedFile = null;

    if (dropzone) {
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleFile(e.target.files[0]);
        });
    }

    function handleFile(file) {
        if (file.type !== 'application/pdf') {
            showToast('Only PDF files are allowed.', 'error');
            return;
        }
        selectedFile = file;
        if (fileInfo) {
            fileInfo.innerHTML = `<i class="fas fa-file-pdf"></i> ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            fileInfo.classList.remove('hidden');
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            showToast('Please select a PDF file.', 'error');
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        const compressionStatus = document.getElementById('compression-status');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }

        let fileToUpload = selectedFile;

        // Compression Logic for files > 50MB
        if (selectedFile.size > 50 * 1024 * 1024) {
            if (compressionStatus) compressionStatus.classList.remove('hidden');
            try {
                fileToUpload = await mockCompressPDF(selectedFile);
                
                if (fileToUpload.size > 50 * 1024 * 1024) {
                    showToast('Compression failed. File still exceeds 50MB. Please upload a smaller file.', 'error');
                    resetForm();
                    return;
                }
                showToast('File compressed successfully!', 'success');
            } catch (err) {
                showToast('Failed to compress PDF.', 'error');
                resetForm();
                return;
            } finally {
                if (compressionStatus) compressionStatus.classList.add('hidden');
            }
        }

        // Upload to Backend
        const formData = new FormData();
        formData.append('pdf', fileToUpload);
        formData.append('courseCode', document.getElementById('course-code').value);
        formData.append('courseName', document.getElementById('course-name').value);
        formData.append('facultyName', document.getElementById('faculty-name').value);
        formData.append('department', document.getElementById('department').value);
        formData.append('semester', document.getElementById('semester').value);
        formData.append('term', document.getElementById('term').value);
        formData.append('academicYear', document.getElementById('academic-year').value);
        formData.append('description', document.getElementById('description').value);

        try {
            const API_URL = 'https://vit-notes-hub.onrender.com';
            const token = localStorage.getItem('vit_token');
            const res = await fetch(`${API_URL}/api/notes/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Upload failed');
            }
            
            showToast('Notes uploaded successfully!', 'success');
            form.reset();
            if (fileInfo) fileInfo.classList.add('hidden');
            selectedFile = null;
        } catch (err) {
            console.error('Upload error:', err);
            showToast('Upload failed: ' + err.message, 'error');
        } finally {
            resetForm();
        }
    });

    function resetForm() {
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Notes';
        }
    }
}

async function mockCompressPDF(file) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(file);
        }, 2000);
    });
}

// Make openPDF globally available for onclick handlers
window.openPDF = function(id, url, title) {
    if (typeof initPDFViewer === 'function') {
        initPDFViewer(url, title);
    } else {
        window.open(url, '_blank');
    }
};

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
