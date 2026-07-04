// Firebase Configuration

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAeDQuBuxUKpOt_5VzuNdPsEpJYKmhPEKY",
  authDomain: "vit-note-hub.firebaseapp.com",
  projectId: "vit-note-hub",
  storageBucket: "vit-note-hub.firebasestorage.app",
  messagingSenderId: "337330202314",
  appId: "1:337330202314:web:64b326c38fc41da959f633",
  measurementId: "G-LZ5CGW6BW8"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Backend URL
const API_URL = 'https://vit-notes-hub.onrender.com';

// Google Auth Provider
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({
    hd: 'vitstudent.ac.in',
    prompt: 'select_account'
});

// Utility: Show Toast
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// Auth State Observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Verify domain
        if (!user.email.endsWith('@vitstudent.ac.in')) {
            showToast('Only VIT students can access VITNotes Hub.', 'error');
            auth.signOut();
            return;
        }

        try {
            // Get ID Token
            const idToken = await user.getIdToken();
            
            // Send to backend for verification
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}` 
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Backend authentication failed');
            }
            
            const data = await response.json();
            
            // Store session token and user data
            localStorage.setItem('vit_token', data.token);
            localStorage.setItem('user_data', JSON.stringify(data.user));

            // Redirect based on role
            const currentPath = window.location.pathname;
            
            if (data.user.role === 'admin') {
                if (!currentPath.includes('admin.html')) {
                    window.location.href = 'admin.html';
                }
            } else {
                if (currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('/')) {
                    window.location.href = 'dashboard.html';
                }
            }
        } catch (error) {
            console.error('Auth error:', error);
            showToast('Authentication failed. Please try again.', 'error');
            auth.signOut();
        }
    } else {
        // User is signed out
        localStorage.removeItem('vit_token');
        localStorage.removeItem('user_data');
        
        // Protect dashboard and admin pages
        const path = window.location.pathname;
        if (path.includes('dashboard.html') || path.includes('admin.html')) {
            window.location.href = 'index.html';
        }
    }
});

// Login Handler
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('google-login-btn') || document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            auth.signInWithPopup(provider).catch((error) => {
                if (error.code !== 'auth/popup-closed-by-user') {
                    console.error('Login error:', error);
                    showToast('Login failed. Please ensure you are using a VIT email.', 'error');
                }
            });
        });
    }

    // Logout Handlers
    const logoutBtns = document.querySelectorAll('#logout-btn, #admin-logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        });
    });
});
