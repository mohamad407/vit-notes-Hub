/* ============================================================
   VITNotes Hub - Frontend Logic (FIXED)
   ============================================================ */

// ---------- CONFIG ----------
const CONFIG = {
  API_URL: 'http://localhost:5000', // Change to your Render URL after deployment
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

// Initialize Firebase
firebase.initializeApp(CONFIG.FIREBASE);
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ---------- STATE ----------
const state = {
  user: null,
  idToken: null,
  currentPage: 1,
  currentFilters: { sort: 'recent' }
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

// ---------- AUTH FUNCTIONS ----------
const openSignup = () => {
  console.log('Opening signup modal');
  const modal = $('#signupModal');
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  } else {
    console.error('Signup modal not found!');
  }
};

const closeSignup = () => {
  const modal = $('#signupModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
};

const handleGoogleSignIn = async () => {
  const btn = $('#googleSignInBtn');
  const originalText = btn.innerHTML;
  
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-loader"></span> Signing in...';
    
    // Set custom parameter to hint VIT domain
    googleProvider.setCustomParameters({
      hd: 'vitstudent.ac.in'
    });
    
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    const email = user.email;

    // Validate VIT email
    if (!email.endsWith('@vitstudent.ac.in')) {
      toast('❌ Only @vitstudent.ac.in emails are allowed', 'error');
      await auth.signOut();
      return;
    }

    const idToken = await user.getIdToken();
    
    // Register/Login with backend
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
    toast(`✅ Welcome, ${res.user.name.split(' ')[0]}!`, 'success');
    loadNotes();
    
  } catch (err) {
    console.error('Sign in error:', err);
    if (err.code === 'auth/popup-closed-by-user') {
      toast('Sign-in cancelled', 'warning');
    } else if (err.code === 'auth/unauthorized-domain') {
      toast('Domain not authorized. Add this domain to Firebase Console.', 'error');
    } else {
      toast(err.message || 'Sign in failed', 'error');
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
};

const logout = async () => {
  try {
    await auth.signOut();
    state.user = null;
    state.idToken = null;
    localStorage.removeItem('vitnotes_user');
    updateUI();
    toast('Logged out successfully', 'success');
    loadNotes();
  } catch (err) {
    toast('Logout failed', 'error');
  }
};

const restoreSession = async () => {
  const saved = localStorage.getItem('vitnotes_user');
  if (!saved) return;
  
  try {
    const user = firebase.auth().currentUser;
    if (user) {
      state.user = JSON.parse(saved);
      state.idToken = await user.getIdToken();
      updateUI();
      loadNotes();
    }
  } catch (e) {
    localStorage.removeItem('vitnotes_user');
  }
};

const updateUI = () => {
  const isAuth = !!state.user;
  
  // Show/hide elements based on auth state
  const loginBtns = $$('.login-trigger');
  loginBtns.forEach(btn => {
    btn.style.display = isAuth ? 'none' : 'inline-flex';
  });
  
  const userMenu = $('#userMenu');
  if (userMenu) {
    userMenu.style.display = isAuth ? 'block' : 'none';
  }
  
  const uploadLink = $('#uploadLink');
  if (uploadLink) {
    uploadLink.style.display = isAuth ? 'inline-block' : 'none';
  }
  
  const adminLink = $('#adminLink');
  if (adminLink) {
    adminLink.style.display = (isAuth && state.user.role === 'admin') ? 'inline-block' : 'none';
  }

  if (isAuth) {
    const userName = $('#userName');
    const userAvatar = $('#userAvatar');
    if (userName) userName.textContent = state.user.name.split(' ')[0];
    if (userAvatar) userAvatar.src = state.user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.user.name)}`;
  }
};

// ---------- UPLOAD FUNCTIONS ----------
const openUploadModal = () => {
  if (!state.user) {
    openSignup();
    return;
  }
  const modal = $('#uploadModal');
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
};

const closeUploadModal = () => {
  const modal = $('#uploadModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    $('#uploadForm').reset();
    $('#fileHint').textContent = 'PDF files only, max 50MB';
    $('#fileDrop').classList.remove('has-file');
  }
};

const handleFileSelect = (file) => {
  if (!file) return;
  
  if (file.type !== 'application/pdf') {
    toast('❌ Only PDF files are allowed', 'error');
    return;
  }
  
  if (file.size > 50 * 1024 * 1024) {
    toast('❌ File size must be 50MB or less', 'error');
    return;
  }
  
  $('#fileDrop').classList.add('has-file');
  $('#fileHint').textContent = `${file.name} (${formatBytes(file.size)})`;
};

const submitUpload = async (e) => {
  e.preventDefault();
  
  const file = $('#notePdf').files[0];
  if (!file) {
    toast('Please select a PDF file', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('title', $('#noteTitle').value);
  formData.append('subject', $('#noteSubject').value);
  formData.append('courseCode', $('#noteCourseCode').value);
  formData.append('facultyName', $('#noteFaculty').value);
  formData.append('semester', $('#noteSemester').value);
  formData.append('term', $('#noteTerm').value); // Fall/Winter
  formData.append('year', $('#noteYear').value);
  formData.append('branch', $('#noteDepartment').value);
  formData.append('description', $('#noteDesc').value);

  const btn = $('#submitUpload');
  const originalText = btn.innerHTML;
  
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-loader"></span> Uploading...';
    
    await api('/api/notes', {
      method: 'POST',
      body: formData
    });
    
    toast('✅ Note uploaded successfully!', 'success');
    closeUploadModal();
    loadNotes();
    
  } catch (err) {
    console.error('Upload error:', err);
    toast(err.message || 'Upload failed', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
};

// ---------- NOTES FUNCTIONS ----------
const loadNotes = async () => {
  const grid = $('#notesGrid');
  if (!grid) return;
  
  grid.innerHTML = '<div class="empty-state"><div class="btn-loader" style="width:40px;height:40px;margin:0 auto;"></div><p style="text-align:center;margin-top:1rem;">Loading notes...</p></div>';

  try {
    const res = await api('/api/notes');
    renderNotes(res.notes || []);
  } catch (err) {
    console.error('Load notes error:', err);
    grid.innerHTML = `<div class="empty-state"><p style="text-align:center;color:var(--danger);">Error: ${err.message}</p><p style="text-align:center;color:var(--text-muted);font-size:0.9rem;">Make sure backend is running</p></div>`;
  }
};

const renderNotes = (notes) => {
  const grid = $('#notesGrid');
  if (!grid) return;
  
  if (!notes || notes.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem;">
        <div style="font-size:4rem;margin-bottom:1rem;">📭</div>
        <h3>No notes found</h3>
        <p>Be the first to upload notes!</p>
      </div>`;
    return;
  }

  grid.innerHTML = notes.map(note => `
    <div class="note-card">
      <div class="note-card-header">
        <span class="note-semester-badge">Sem ${note.semester}</span>
        <div class="note-subject">${escapeHtml(note.subject)}</div>
        <div class="note-title">${escapeHtml(note.title)}</div>
      </div>
      <div class="note-card-body">
        <div class="note-meta">
          <span class="note-tag branch">${note.branch}</span>
          ${note.courseCode ? `<span class="note-tag">${note.courseCode}</span>` : ''}
          ${note.term ? `<span class="note-tag">${note.term} ${note.year}</span>` : ''}
        </div>
        ${note.facultyName ? `<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.5rem;">👨‍ ${escapeHtml(note.facultyName)}</p>` : ''}
      </div>
      <div class="note-card-footer">
        <span>${escapeHtml(note.uploaderName || 'Anonymous')}</span>
        <div class="note-stats">
          <span>👁 ${note.views || 0}</span>
        </div>
      </div>
    </div>
  `).join('');
};

// ---------- HELPERS ----------
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
};

// ---------- EVENT LISTENERS ----------
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, attaching event listeners...');
  
  // Auth listeners
  auth.onAuthStateChanged((user) => {
    console.log('Auth state changed:', user?.email);
  });
  
  // Sign-in buttons
  const loginTriggers = $$('.login-trigger');
  loginTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Login trigger clicked');
      openSignup();
    });
  });
  
  // Google sign-in button
  const googleBtn = $('#googleSignInBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', handleGoogleSignIn);
    console.log('Google sign-in listener attached');
  }
  
  // Close signup modal
  const closeSignupBtn = $('#closeSignup');
  if (closeSignupBtn) {
    closeSignupBtn.addEventListener('click', closeSignup);
  }
  
  // Upload modal triggers
  const uploadTriggers = $('#uploadLink');
  if (uploadTriggers) {
    uploadTriggers.addEventListener('click', (e) => {
      e.preventDefault();
      openUploadModal();
    });
  }
  
  // Close upload modal
  const closeUploadBtn = $('#closeUpload');
  if (closeUploadBtn) {
    closeUploadBtn.addEventListener('click', closeUploadModal);
  }
  
  // Logout
  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  
  // User dropdown
  const userBtn = $('#userBtn');
  const userDropdown = $('#userDropdown');
  if (userBtn && userDropdown) {
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => userDropdown.classList.remove('show'));
  }
  
  // File drop handling
  const fileDrop = $('#fileDrop');
  const fileInput = $('#notePdf');
  
  if (fileDrop && fileInput) {
    fileDrop.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
      handleFileSelect(e.target.files[0]);
    });
    
    ['dragover', 'dragenter'].forEach(ev => {
      fileDrop.addEventListener(ev, (e) => {
        e.preventDefault();
        fileDrop.classList.add('dragover');
      });
    });
    
    ['dragleave', 'drop'].forEach(ev => {
      fileDrop.addEventListener(ev, (e) => {
        e.preventDefault();
        fileDrop.classList.remove('dragover');
      });
    });
    
    fileDrop.addEventListener('drop', (e) => {
      handleFileSelect(e.dataTransfer.files[0]);
    });
  }
  
  // Upload form
  const uploadForm = $('#uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', submitUpload);
  }
  
  // Close modals on backdrop click
  $$('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
      }
    });
  });
  
  // ESC key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $$('.modal.show').forEach(m => {
        m.classList.remove('show');
        document.body.style.overflow = '';
      });
    }
  });
  
  // Initialize
  restoreSession();
  loadNotes();
  
  console.log('All event listeners attached!');
});
