/**
 * NenoTech Portal Auth Scripts
 * Dual Theme Synchronization & Responsive Tab Switching
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Theme Management System ---
    const htmlElement = document.documentElement;
    const themeToggleBtn = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');

    // Load saved theme from localStorage (shared with portfolio)
    const savedTheme = localStorage.getItem('nenotech_theme') || 'dark';
    setTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('nenotech_theme', theme);

        if (themeIcon) {
            if (theme === 'light') {
                themeIcon.className = 'fa-solid fa-moon text-primary';
                themeToggleBtn.setAttribute('title', 'Switch to Dark Mode');
            } else {
                themeIcon.className = 'fa-solid fa-sun text-warning';
                themeToggleBtn.setAttribute('title', 'Switch to Light Mode');
            }
        }
    }

    // --- 2. Auth Panel Switching (Desktop & Mobile) ---
    const container = document.getElementById('container');
    const registerBtn = document.getElementById('register');
    const loginBtn = document.getElementById('login');

    const mobileSignInTab = document.getElementById('mobileSignInTab');
    const mobileSignUpTab = document.getElementById('mobileSignUpTab');
    const mobileGoToSignUp = document.getElementById('mobileGoToSignUp');
    const mobileGoToSignIn = document.getElementById('mobileGoToSignIn');

    function switchToSignUp() {
        container.classList.add('active');
        if (mobileSignInTab && mobileSignUpTab) {
            mobileSignInTab.classList.remove('active');
            mobileSignUpTab.classList.add('active');
        }
    }

    function switchToSignIn() {
        container.classList.remove('active');
        if (mobileSignInTab && mobileSignUpTab) {
            mobileSignUpTab.classList.remove('active');
            mobileSignInTab.classList.add('active');
        }
    }

    // Desktop sliding trigger
    if (registerBtn) registerBtn.addEventListener('click', switchToSignUp);
    if (loginBtn) loginBtn.addEventListener('click', switchToSignIn);

    // Mobile tabs trigger
    if (mobileSignUpTab) mobileSignUpTab.addEventListener('click', switchToSignUp);
    if (mobileSignInTab) mobileSignInTab.addEventListener('click', switchToSignIn);

    // Mobile inline links trigger
    if (mobileGoToSignUp) mobileGoToSignUp.addEventListener('click', (e) => {
        e.preventDefault();
        switchToSignUp();
    });
    if (mobileGoToSignIn) mobileGoToSignIn.addEventListener('click', (e) => {
        e.preventDefault();
        switchToSignIn();
    });

    // --- 3. Super Admin Panel Sync (Sign-in & Sign-up Persistence) ---
    const signUpForm = document.querySelector('.form-container.sign-up form');
    const signInForm = document.querySelector('.form-container.sign-in form');

    function syncUserAuth(name, email, isNewUser = false) {
        try {
            const existingUsers = JSON.parse(localStorage.getItem('nenotech_users') || '[]');
            const normalizedEmail = (email || '').trim().toLowerCase();
            
            let user = existingUsers.find(u => u.email.toLowerCase() === normalizedEmail);
            if (!user) {
                user = {
                    id: Date.now(),
                    name: name || (normalizedEmail.split('@')[0]) || 'User',
                    email: normalizedEmail,
                    role: 'Project Client',
                    status: 'online',
                    lastSignIn: 'Just now',
                    device: navigator.platform || 'Web Browser',
                    allowedSections: ['projects', 'inquiries'],
                    createdAt: new Date().toISOString()
                };
                existingUsers.unshift(user);
            } else {
                user.status = 'online';
                user.lastSignIn = 'Just now';
                if (name && !user.name) user.name = name;
            }

            localStorage.setItem('nenotech_users', JSON.stringify(existingUsers));
            localStorage.setItem('nenotech_last_auth_event', JSON.stringify({
                type: isNewUser ? 'signup' : 'signin',
                name: user.name,
                email: user.email,
                timestamp: Date.now()
            }));
            localStorage.setItem('nenotech_current_session', JSON.stringify(user));

            // Instant redirect to NenoTech Dashboard
            window.location.href = '../dashboard.html';
        } catch (err) {
            console.error('Error syncing auth:', err);
        }
    }

    if (signUpForm) {
        signUpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputs = signUpForm.querySelectorAll('input');
            const name = inputs[0] ? inputs[0].value : '';
            const email = inputs[1] ? inputs[1].value : '';
            syncUserAuth(name, email, true);
        });
    }

    if (signInForm) {
        signInForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputs = signInForm.querySelectorAll('input');
            const email = inputs[0] ? inputs[0].value : '';
            syncUserAuth('', email, false);
        });
    }
});