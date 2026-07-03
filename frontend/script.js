/* ============================================================
   VITNotes Hub - Frontend Logic
   ============================================================ */

// ---------- CONFIG ----------
const CONFIG = {
  API_URL: 'https://your-backend.onrender.com', // <-- REPLACE WITH YOUR RENDER URL
  const firebaseConfig = {
  apiKey: "AIzaSyAeDQuBuxUKpOt_5VzuNdPsEpJYKmhPEKY",
  authDomain: "vit-note-hub.firebaseapp.com",
  projectId: "vit-note-hub",
  storageBucket: "vit-note-hub.firebasestorage.app",
  messagingSenderId: "337330202314",
  appId: "1:337330202314:web:64b326c38fc41da959f633",
  measurementId: "G-LZ5CGW6BW8"
};

// Initialize Firebase
firebase.initializeApp(CONFIG.FIREBASE);
const auth = firebase.auth();

// ---------- STATE ----------
const state = {
  user: null,
  idToken: null,
  currentPage: 1,
  currentFilters: { sort: 'recent' },
  pdfDoc: null,
  pdfPage: 1,
  pdfScale: 1.2
};

// ---------- UTILITIES ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

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

const toast = (message, type = 'info') => {
  const container = $('#toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'slideInRight .3s ease reverse';
    setTimeout(() => el.remove(), 300);
  }, 3500);
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
};

// ---------- AUTH ----------
const openSignup = () => $('#signupModal').classList.add('show');
const closeSignup = () => $('#signupModal').classList.remove('show');

const handleGoogleSignIn = async () => {
  const btn = $('#googleSignInBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-loader"></span> Signing in...';
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ hd: 'vitstudent.ac.in' });
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    const email = user.email;

    if (!email.endsWith('@vitstudent.ac.in')) {
      toast('Only @vitstudent.ac.in emails allowed', 'error');
      await auth.signOut();
      return;
    }

    const idToken = await user.getIdToken();
    const res = await api('/api/auth/google', {
      method: 'POST',
      body: {
        idToken,
        name: user.displayName,
        email: user.email,
        profilePic: user.photoURL
      }
    });

    state.user = res.user;
    state.idToken = idToken;
    localStorage.setItem('vitnotes_user', JSON.stringify(res.user));

    closeSignup();
    updateUI();
    toast(`Welcome, ${res.user.name}!`, 'success');
    loadNotes();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Sign in failed', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span>Continue with Google</span>`;
  }
};

const logout = async () => {
  await auth.signOut();
  state.user = null;
  state.idToken = null;
  localStorage.removeItem('vitnotes_user');
  updateUI();
  toast('Logged out successfully', 'success');
};

const restoreSession = async () => {
  const saved = localStorage.getItem('vitnotes_user');
  if (!saved) return;
  try {
    state.user = JSON.parse(saved);
    const currentUser = auth.currentUser;
    if (currentUser) {
      state.idToken = await currentUser.getIdToken();
    }
    updateUI();
    loadNotes();
  } catch (e) {
    localStorage.removeItem('vitnotes_user');
  }
};

const updateUI = () => {
  const isAuth = !!state.user;
  $('#loginBtn').style.display = isAuth ? 'none' : 'inline-flex';
  $('#heroLoginBtn').style.display = isAuth ? 'none' : 'inline-flex';
  $('#userMenu').style.display = isAuth ? 'block' : 'none';
  $('#uploadLink').style.display = isAuth ? 'inline-block' : 'none';
  $('#adminLink').style.display = (isAuth && state.user.role === 'admin') ? 'inline-block' : 'none';

  if (isAuth) {
    $('#userName').textContent = state.user.name.split(' ')[0];
    $('#userAvatar').src = state.user.profilePic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(state.user.name);
  }
};

// ---------- NOTES ----------
const loadNotes = async () => {
  const grid = $('#notesGrid');
  grid.innerHTML = '<div class="empty-state"><div class="btn-loader" style="width:40px;height:40px;border-width:3px;margin:0 auto;border-color:var(--primary);border-top-color:transparent;"></div></div>';

  const params = new URLSearchParams({
    page: state.currentPage,
    limit: 12,
    ...state.currentFilters
  });

  try {
    const res = await api(`/api/notes?${params}`);
    renderNotes(res.notes);
    renderPagination(res.pagination);
    updateStats(res.pagination.total);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>${err.message}</p></div>`;
  }
};

const renderNotes = (notes) => {
  const grid = $('#notesGrid');
  if (!notes || notes.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><h3>No notes found</h3><p>Try adjusting your filters or be the first to upload!</p></div>`;
    return;
  }

  grid.innerHTML = notes.map(note => `
    <div class="note-card" data-id="${note._id}">
      <div class="note-card-header">
        <span class="note-semester-badge">Sem ${note.semester}</span>
        <div class="note-subject">${escapeHtml(note.subject)}</div>
        <div class="note-title">${escapeHtml(note.title)}</div>
      </div>
      <div class="note-card-body">
        <div class="note-meta">
          <span class="note-tag branch">${note.branch}</span>
          ${note.courseCode ? `<span class="note-tag">${note.courseCode}</span>` : ''}
        </div>
        ${note.description ? `<p class="note-desc">${escapeHtml(note.description).substring(0, 100)}${note.description.length > 100 ? '...' : ''}</p>` : ''}
      </div>
      <div class="note-card-footer">
        <span>${escapeHtml(note.uploaderName || 'Anonymous')}</span>
        <div class="note-stats">
          <span class="note-stat">👁 ${note.views}</span>
          <span class="note-stat">❤ ${note.likes}</span>
          <span class="note-stat">${formatBytes(note.fileSize)}</span>
        </div>
      </div>
    </div>
  `).join('');

  $$('.note-card').forEach(card => {
    card.addEventListener('click', () => openNote(card.dataset.id));
  });
};

const renderPagination = ({ page, pages, total }) => {
  const container = $('#pagination');
  if (pages <= 1) { container.innerHTML = ''; return; }

  let html = `<button class="page-btn" ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">← Prev</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    } else if (i === page - 2 || i === page + 2) {
      html += `<span style="padding:.5rem">...</span>`;
    }
  }
  html += `<button class="page-btn" ${page === pages ? 'disabled' : ''} data-page="${page + 1}">Next →</button>`;
  container.innerHTML = html;

  $$('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      state.currentPage = parseInt(btn.dataset.page);
      loadNotes();
      $('#browse').scrollIntoView({ behavior: 'smooth' });
    });
  });
};

const updateStats = (totalNotes) => {
  $('#statNotes').textContent = totalNotes.toLocaleString();
  $('#statUsers').textContent = '500+';
  $('#statViews').textContent = '10K+';
};

const openNote = async (id) => {
  try {
    const res = await api(`/api/notes/${id}`);
    const note = res.note;
    $('#viewerTitle').textContent = note.title;
    $('#viewerModal').classList.add('show');
    await loadPdf(note.pdfUrl);
    state.currentNote = note;
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ---------- PDF VIEWER ----------
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const loadPdf = async (url) => {
  try {
    const loadingTask = pdfjsLib.getDocument(url);
    state.pdfDoc = await loadingTask.promise;
    state.pdfPage = 1;
    renderPdfPage();
  } catch (err) {
    toast('Failed to load PDF', 'error');
  }
};

const renderPdfPage = async () => {
  if (!state.pdfDoc) return;
  const page = await state.pdfDoc.getPage(state.pdfPage);
  const viewport = page.getViewport({ scale: state.pdfScale });
  const canvas = $('#pdfCanvas');
  const ctx = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await page.render({ canvasContext: ctx, viewport }).promise;
  $('#pageInfo').textContent = `${state.pdfPage} / ${state.pdfDoc.numPages}`;
};

// ---------- UPLOAD ----------
const handleFileSelect = (file) => {
  if (!file) return;
  if (file.type !== 'application/pdf') {
    toast('Only PDF files allowed', 'error');
    return;
  }
  if (file.size > 25 * 1024 * 1024) {
    toast('File too large (max 25MB)', 'error');
    return;
  }
  $('#fileDrop').classList.add('has-file');
  $('#fileHint').textContent = `${file.name} (${formatBytes(file.size)})`;
};

const submitUpload = async (e) => {
  e.preventDefault();
  const btn = $('#submitUpload');
  const file = $('#notePdf').files[0];
  if (!file) return toast('Please select a PDF', 'error');

  btn.disabled = true;
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-loader').style.display = 'inline-block';

  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('title', $('#noteTitle').value);
  formData.append('subject', $('#noteSubject').value);
  formData.append('semester', $('#noteSemester').value);
  formData.append('branch', $('#noteBranch').value);
  formData.append('courseCode', $('#noteCode').value);
  formData.append('description', $('#noteDesc').value);

  try {
    await api('/api/notes', { method: 'POST', body: formData });
    toast('Note uploaded successfully!', 'success');
    $('#uploadModal').classList.remove('show');
    $('#uploadForm').reset();
    $('#fileDrop').classList.remove('has-file');
    $('#fileHint').textContent = 'PDF files only';
    loadNotes();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').style.display = 'inline';
    btn.querySelector('.btn-loader').style.display = 'none';
  }
};

// ---------- HELPERS ----------
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
};

// ---------- EVENT LISTENERS ----------
document.addEventListener('DOMContentLoaded', () => {
  // Auth
  $('#loginBtn').addEventListener('click', openSignup);
  $('#heroLoginBtn').addEventListener('click', openSignup);
  $('#closeSignup').addEventListener('click', closeSignup);
  $('#googleSignInBtn').addEventListener('click', handleGoogleSignIn);
  $('#logoutBtn').addEventListener('click', logout);

  // User dropdown
  $('#userBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    $('#userDropdown').classList.toggle('show');
  });
  document.addEventListener('click', () => $('#userDropdown').classList.remove('show'));

  // Mobile nav
  $('#mobileToggle').addEventListener('click', () => {
    $('.nav-links').classList.toggle('show');
  });

  // Upload modal
  $('#uploadLink').addEventListener('click', (e) => {
    e.preventDefault();
    if (!state.user) return openSignup();
    $('#uploadModal').classList.add('show');
  });
  $('#footerUpload').addEventListener('click', (e) => {
    e.preventDefault();
    if (!state.user) return openSignup();
    $('#uploadModal').classList.add('show');
  });
  $('#closeUpload').addEventListener('click', () => $('#uploadModal').classList.remove('show'));

  // File drop
  const fileDrop = $('#fileDrop');
  const fileInput = $('#notePdf');
  fileDrop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
  ['dragover', 'dragenter'].forEach(ev => fileDrop.addEventListener(ev, (e) => {
    e.preventDefault(); fileDrop.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach(ev => fileDrop.addEventListener(ev, (e) => {
    e.preventDefault(); fileDrop.classList.remove('dragover');
  }));
  fileDrop.addEventListener('drop', (e) => handleFileSelect(e.dataTransfer.files[0]));

  // Upload form
  $('#uploadForm').addEventListener('submit', submitUpload);

  // Filters
  $('#searchBtn').addEventListener('click', () => {
    state.currentFilters.search = $('#searchInput').value;
    state.currentPage = 1;
    loadNotes();
  });
  $('#searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') $('#searchBtn').click();
  });
  ['semesterFilter', 'branchFilter', 'sortFilter'].forEach(id => {
    $(`#${id}`).addEventListener('change', (e) => {
      const key = id.replace('Filter', '');
      state.currentFilters[key] = e.target.value;
      state.currentPage = 1;
      loadNotes();
    });
  });

  // PDF viewer controls
  $('#closeViewer').addEventListener('click', () => {
    $('#viewerModal').classList.remove('show');
    state.pdfDoc = null;
  });
  $('#prevPage').addEventListener('click', () => {
    if (state.pdfPage > 1) { state.pdfPage--; renderPdfPage(); }
  });
  $('#nextPage').addEventListener('click', () => {
    if (state.pdfDoc && state.pdfPage < state.pdfDoc.numPages) { state.pdfPage++; renderPdfPage(); }
  });
  $('#zoomIn').addEventListener('click', () => {
    state.pdfScale = Math.min(3, state.pdfScale + 0.2); renderPdfPage();
  });
  $('#zoomOut').addEventListener('click', () => {
    state.pdfScale = Math.max(0.5, state.pdfScale - 0.2); renderPdfPage();
  });
  $('#downloadPdf').addEventListener('click', () => {
    if (state.currentNote) window.open(state.currentNote.pdfUrl, '_blank');
  });

  // Close modals on backdrop click
  $$('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('show');
    });
  });

  // ESC key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal.show').forEach(m => m.classList.remove('show'));
  });

  // Restore session and load initial notes
  restoreSession();
  loadNotes();
});
