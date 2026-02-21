import { supabase } from '../js/supabase-client.js';

// 1. Check Auth State (Run immediately)
async function checkAuth() {
    // Warning if running directly from file system
    if (window.location.protocol === 'file:') {
        console.warn("⚠️ Warning: You are running via file:// protocol. Authentication requires a local server (like Live Server) to work correctly.");
    }

    const { data: { session } } = await supabase.auth.getSession();

    const isLoginPage = window.location.pathname.includes('login.html');

    if (isLoginPage) {
        // If on login page and already logged in, go to dashboard
        if (session) {
            window.location.href = 'index.html';
        }
    } else {
        // If on an admin page and NOT logged in, go to login
        if (!session) {
            window.location.href = 'login.html?error=access_denied';
        } else {
            // User IS logged in: Reveal the page (undoing the CSS hiding)
            document.body.style.visibility = 'visible';
            document.body.style.opacity = '1';
        }
    }
}

// 2. Login Function
async function login(email, password) {
    const submitBtn = document.getElementById('login-btn');
    const originalText = submitBtn.textContent;
    
    submitBtn.textContent = 'Verifying...';
    submitBtn.disabled = true;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        console.error("Login Error:", error); // See console for exact details
        alert('Login Failed: ' + error.message);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    } else {
        window.location.href = 'index.html';
    }
}

// 3. Logout Function
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        window.location.href = 'login.html';
    }
}

// Run check immediately
checkAuth();

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Handle Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            login(email, password);
        });
    }
    
    // Check for Access Denied error in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'access_denied') {
        alert("⚠️ Access Denied: You must be logged in to view the Admin Portal.");
        // Clean the URL so the alert doesn't show again on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Handle Logout Button (in sidebar)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});