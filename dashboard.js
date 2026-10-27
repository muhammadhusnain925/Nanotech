/**
 * ==========================================================================
 * NenoTech Super Admin Suite - Controller
 * Features:
 * 1. Super Admin Control & User Management
 * 2. Granular Role-Based Access Control (RBAC) & Section Permissions
 * 3. Live Impersonation / "View As" Mode to test allowed sections
 * 4. Real-Time Website Sign-in Sync (localStorage & storage events)
 * 5. Interactive Charts, Project Manager & Lead Inquiries
 * ==========================================================================
 */

(function () {
    'use strict';

    // --------------------------------------------------------------------------
    // 1. Initial State & Data Store
    // --------------------------------------------------------------------------
    const defaultUsers = [
        {
            id: 101,
            name: 'Husnain',
            email: 'husnain@nenotech.dev',
            role: 'Super Admin',
            status: 'online',
            lastSignIn: 'Active now',
            device: 'Windows 11 • Chrome 124',
            password: 'Husnain@Neno2024!',
            allowedSections: ['users', 'overview', 'projects', 'inquiries', 'testimonials', 'settings'],
            createdAt: '2024-01-15'
        },
        {
            id: 102,
            name: 'Sarah Khan',
            email: 'sarah@studioapex.design',
            role: 'Project Client',
            status: 'online',
            lastSignIn: '12m ago',
            device: 'macOS Sonoma • Safari 17',
            password: 'Sarah@Studio2024',
            allowedSections: ['overview', 'projects', 'inquiries', 'testimonials'],
            createdAt: '2024-03-10'
        },
        {
            id: 103,
            name: 'James Danvers',
            email: 'jdanvers@techventures.io',
            password: 'JDanvers@Tech2024!',
            role: 'Project Client',
            status: 'offline',
            lastSignIn: '3h ago',
            device: 'iOS 17 • Mobile Safari',
            password: 'James@Ventures2024!',
            allowedSections: ['projects', 'inquiries', 'testimonials'],
            createdAt: '2024-02-18'
        },
        {
            id: 104,
            name: 'Michael Rodriguez',
            email: 'michael@cloudflow.tech',
            role: 'Developer',
            status: 'online',
            lastSignIn: 'Active now',
            device: 'Ubuntu Linux • Firefox',
            allowedSections: ['overview', 'projects', 'testimonials'],
            createdAt: '2024-02-28'
        },
        {
            id: 105,
            name: 'David Chen',
            email: 'david@apexai.co',
            role: 'Viewer',
            status: 'offline',
            lastSignIn: 'Yesterday',
            device: 'Windows 10 • Edge',
            allowedSections: ['overview', 'testimonials'],
            createdAt: '2024-03-01'
        }
    ];

    const defaultTestimonials = [
        {
            id: 1,
            clientName: 'James Danvers',
            role: 'Product Director',
            company: 'TechVentures',
            project: 'Modern E-Commerce Store',
            rating: 5,
            quote: 'Husnain transformed our outdated web interface into a sleek, lightning-fast digital storefront. His attention to detail and responsiveness were outstanding.',
            featured: true,
            createdAt: '2024-03-01'
        },
        {
            id: 2,
            clientName: 'Sarah Khan',
            role: 'Founder & Creative Lead',
            company: 'StudioApex',
            project: 'Creative Agency Portfolio',
            rating: 5,
            quote: 'Working with NenoTech was effortless. Husnain understands modern web design trends deeply. The glassmorphism and animated effects he crafted elevated our brand instantly!',
            featured: true,
            createdAt: '2024-03-12'
        },
        {
            id: 3,
            clientName: 'David Chen',
            role: 'Head of Engineering',
            company: 'ApexAI',
            project: 'Developer Dashboard Suite',
            rating: 5,
            quote: 'Top-tier frontend engineering with clean vanilla JS and Bootstrap. Delivers robust, responsive, and SEO-optimized web apps every single time.',
            featured: true,
            createdAt: '2024-03-15'
        },
        {
            id: 4,
            clientName: 'Michael Rodriguez',
            role: 'Lead Cloud Architect',
            company: 'CloudFlow Tech',
            project: 'Telemetry Dashboard Engine',
            rating: 5,
            quote: 'Exceptional code structure, modular architecture, and smooth SVG visualizations. A pleasure to collaborate with Husnain on complex UI requirements.',
            featured: true,
            createdAt: '2024-02-20'
        },
        {
            id: 5,
            clientName: 'Elena Rostova',
            role: 'Product Lead',
            company: 'FinPulse Media',
            project: 'Fintech Micro-Banking UI',
            rating: 5,
            quote: 'Delivered ahead of schedule with immaculate attention to cross-browser responsiveness and accessibility. Truly impressive pair programming.',
            featured: false, // Pending Super Admin approval
            createdAt: '2024-03-18'
        }
    ];

    // Backfill any stored user that lacks a password (e.g. rosters saved before
    // seeds carried credentials) so the eye always reveals a genuine value.
    // Prefers the crafted seed password when the email matches, else a derived one.
    function backfillPasswords(users) {
        const seedByEmail = {};
        defaultUsers.forEach(s => { seedByEmail[s.email] = s; });
        let changed = false;
        users.forEach(u => {
            if (u.password) return;
            const seed = seedByEmail[u.email];
            u.password = (seed && seed.password) || derivePassword(u);
            changed = true;
        });
        return changed;
    }

    // Deterministic, human-readable credential derived from the account itself
    // ((email local-part + id). Stable on every reload and unique per account.
    // This browser demo never stores these server-side — they're demo values.
    function derivePassword(u) {
        const local = String((u.email || '').split('@')[0] || u.name || 'user')
            .replace(/[^A-Za-z0-9]/g, '');
        const base = (local || 'User').charAt(0).toUpperCase() + (local || 'User').slice(1);
        let seed = 0;
        const hay = String(u.id || '') + String(u.email || '') + String(u.name || '');
        for (let i = 0; i < hay.length; i++) seed = (seed * 31 + hay.charCodeAt(i)) >>> 0;
        const num = 100 + (seed % 900);
        const sym = (seed % 2 === 0) ? '!' : '@';
        return base + '@' + num + sym;
    }

    // Prefer the crafted seed password (matched by email) if present, else derive
    // a stable human-readable one from the account. O(1) lookup per email.
    const seedPasswordByEmail = {};
    defaultUsers.forEach(function (s) { if (s.email) seedPasswordByEmail[s.email.toLowerCase()] = s.password || ''; });

    // Load users from localStorage or fallback to default
    function getStoredUsers() {
        try {
            const raw = localStorage.getItem('nenotech_users');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    parsed.forEach(u => {
                        if (Array.isArray(u.allowedSections)) {
                            // Migrate 'health' -> 'testimonials'
                            const hIdx = u.allowedSections.indexOf('health');
                            if (hIdx !== -1) u.allowedSections.splice(hIdx, 1, 'testimonials');
                            if (u.role === 'Super Admin') {
                                ['users', 'overview', 'projects', 'inquiries', 'testimonials', 'settings'].forEach(sec => {
                                    if (!u.allowedSections.includes(sec)) u.allowedSections.push(sec);
                                });
                            }
                        }
                    });

                    const superAdmins = parsed.filter(u => u.role === 'Super Admin');
                    if (superAdmins.length > 1) {
                        const keepUserId = superAdmins[0].id;
                        parsed.forEach(u => {
                            if (u.role === 'Super Admin' && u.id !== keepUserId) {
                                u.role = 'Project Client';
                                u.allowedSections = ['overview', 'projects', 'inquiries', 'testimonials'];
                            }
                        });
                        localStorage.setItem('nenotech_users', JSON.stringify(parsed));
                    }

                    // Backfill any account lacking a credential so the eye always
                    // reveals a real, stable value — even for rosters saved before
                    // seeds carried passwords.
                    if (backfillPasswords(parsed)) {
                        localStorage.setItem('nenotech_users', JSON.stringify(parsed));
                    }

                    return parsed;
                }
            }
        } catch (e) {
            console.error('Error reading nenotech_users:', e);
        }
        localStorage.setItem('nenotech_users', JSON.stringify(defaultUsers));
        return defaultUsers;
    }

    function getStoredTestimonials() {
        try {
            const raw = localStorage.getItem('nenotech_testimonials');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Error reading nenotech_testimonials:', e);
        }
        localStorage.setItem('nenotech_testimonials', JSON.stringify(defaultTestimonials));
        return defaultTestimonials;
    }

    function getStoredProjects() {
        try {
            const raw = localStorage.getItem('nenotech_projects');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Error reading nenotech_projects:', e);
        }
        localStorage.setItem('nenotech_projects', JSON.stringify(defaultProjects));
        return defaultProjects;
    }

    function getStoredInquiries() {
        try {
            const raw = localStorage.getItem('nenotech_inquiries');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Error reading nenotech_inquiries:', e);
        }
        localStorage.setItem('nenotech_inquiries', JSON.stringify(defaultInquiries));
        return defaultInquiries;
    }

    // Safe persistence wrapper — catches quota/availability errors instead of throwing
    function persist(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Error saving ${key} to localStorage:`, e);
            return false;
        }
    }

    // HTML-escape dynamic values before they are injected into innerHTML (XSS guard)
    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Neutralize Excel formula injection in CSV exports
    function csvCell(value) {
        let str = String(value == null ? '' : value).replace(/"/g, '""');
        if (/^[=+\-@]/.test(str)) str = "'" + str;
        return str;
    }

    function debounce(fn, delay) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    const defaultProjects = [
            {
                id: 1,
                title: 'Modern E-Commerce Store',
                category: 'web-apps',
                status: 'deployed',
                progress: 100,
                image: '1.jpg',
                tags: ['HTML5', 'Bootstrap 5', 'JavaScript', 'Cart'],
                desc: 'A high-performance responsive storefront with dynamic cart logic, instant category filtering, and checkout flow.',
                client: 'RetailFlow Global'
            },
            {
                id: 2,
                title: 'Creative Agency Portfolio',
                category: 'frontend',
                status: 'review',
                progress: 85,
                image: '2.jpeg',
                tags: ['CSS Grid', 'Glassmorphism', 'Vanilla JS'],
                desc: 'Stunning frosted glass aesthetics, smooth scroll interactions, and interactive project cards designed for high conversions.',
                client: 'StudioApex'
            },
            {
                id: 3,
                title: 'Developer Dashboard Suite',
                category: 'interactive',
                status: 'deployed',
                progress: 100,
                image: 'NenoTech.jpeg',
                tags: ['REST APIs', 'SVG Charts', 'Dark Mode'],
                desc: 'An intuitive, accessible workspace featuring real-time telemetry, modular tab management, and neon-accented UI.',
                client: 'NenoTech Core'
            },
            {
                id: 4,
                title: 'CloudFlow Realtime Telemetry',
                category: 'web-apps',
                status: 'in-progress',
                progress: 65,
                image: '3.png',
                tags: ['Node.js', 'Express', 'WebSockets'],
                desc: 'Real-time server health and API latency monitoring service with automated anomaly detection.',
                client: 'CloudFlow Corp'
            },
            {
                id: 5,
                title: 'Mobile App Design System',
                category: 'frontend',
                status: 'in-progress',
                progress: 75,
                image: '1.jpg',
                tags: ['Bootstrap 5', 'Touch Gestures', 'Animations'],
                desc: 'Comprehensive UI component kit optimized for cross-browser mobile web and embedded web views.',
                client: 'Fintech Spark'
            },
            {
                id: 6,
                title: 'High-Speed REST API Engine',
                category: 'api',
                status: 'deployed',
                progress: 100,
                image: 'NenoTech.jpeg',
                tags: ['REST APIs', 'Node.js', 'JWT Auth'],
                desc: 'Lightweight microservices backend for handling contact inquiries, client auth, and secure cache syncing.',
                client: 'NenoTech Infra'
            }
    ];

    const defaultInquiries = [
            {
                id: 1,
                name: 'Sarah Khan',
                email: 'sarah@studioapex.design',
                company: 'StudioApex',
                subject: 'Custom Glassmorphic Web App Design',
                message: 'Hi Husnain, we loved your NenoTech portfolio aesthetics and want to collaborate on a brand new web application with similar frosted glass cards, neon accents, and dual theme toggles.',
                budget: '$3,200',
                status: 'unread',
                time: '12m ago'
            },
            {
                id: 2,
                name: 'James Danvers',
                email: 'jdanvers@techventures.io',
                company: 'TechVentures',
                subject: 'E-Commerce Storefront Re-architecture',
                message: 'Husnain, our client storefront needs rapid mobile responsiveness and checkout optimization. Clean code and accessibility are top priorities. When are you available for a discovery call?',
                budget: '$4,500',
                status: 'replied',
                time: '3h ago'
            },
            {
                id: 3,
                name: 'Michael Rodriguez',
                email: 'michael@cloudflow.tech',
                company: 'CloudFlow',
                subject: 'API Integration & Real-time Telemetry Dashboard',
                message: 'Looking for a skilled developer to build a modern telemetry dashboard with low-latency updates, dark mode, and clean charts.',
                budget: '$5,000',
                status: 'unread',
                time: '5h ago'
            },
            {
                id: 4,
                name: 'David Chen',
                email: 'david@apexai.co',
                company: 'Apex AI',
                subject: 'Landing Page Performance & SEO Audit',
                message: 'Need to get our Core Web Vitals to 99+ and redesign our product showcase section with smooth animations.',
                budget: '$1,800',
                status: 'replied',
                time: '1d ago'
            },
            {
                id: 5,
                name: 'Elena Rostova',
                email: 'elena@nordicdesign.se',
                company: 'Nordic Design',
                subject: 'Full-Stack Design System & Component Library',
                message: 'We want to standardize our client tools with a unified Bootstrap-based glassmorphic component system. We love your work on NenoTech!',
                budget: '$6,200',
                status: 'unread',
                time: '2d ago'
            }
    ];

    // --------------------------------------------------------------------------
    // Single source of truth for the dashboard's grantable sections.
    // Powers the User table Access dropdown (via `short`) and the permissions
    // modal cards (via `label`, `desc`, `icon`, `color`). Add a section here
    // and it appears everywhere automatically.
    // --------------------------------------------------------------------------
    const SECTION_META = [
        { key: 'overview',     short: 'Overview', label: 'Overview & Growth KPIs',        desc: 'Access high-level analytics, visit counters, and activity curves.',          icon: 'bi-speedometer2', color: 'var(--accent-cyan)' },
        { key: 'projects',     short: 'Projects', label: 'Projects Manager',              desc: 'View milestone cards, progress bars, and project codebases.',              icon: 'bi-kanban',       color: 'var(--accent-cyan)' },
        { key: 'inquiries',    short: 'Leads',    label: 'Client Leads & Messages',       desc: 'Read incoming contact form inquiries and send direct responses.',          icon: 'bi-inbox-fill',   color: 'var(--accent-purple)' },
        { key: 'testimonials', short: 'Reviews',  label: 'Client Reviews & Testimonials', desc: 'View client endorsements, ratings, and submit project testimonials.',      icon: 'bi-star-fill',    color: 'var(--accent-amber)' },
        { key: 'settings',     short: 'Settings', label: 'Workspace Settings',            desc: 'Modify studio configurations, preferences, and webhooks.',                icon: 'bi-gear-fill',    color: 'var(--accent-cyan)' }
    ];

    const state = {
        theme: localStorage.getItem('nenotech_theme') || 'dark',
        activeView: 'users', // Default to Super Admin User Management
        users: getStoredUsers(),
        testimonials: getStoredTestimonials(),
        currentViewingUser: null, // null = Super Admin Husnain; when set to a user object = Impersonation Mode
        projects: getStoredProjects(),
        inquiries: getStoredInquiries()
    };

    // --------------------------------------------------------------------------
    // 2. DOM Elements
    // --------------------------------------------------------------------------
    const elements = {
        html: document.documentElement,
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        themeToggleIcon: document.getElementById('themeToggleIcon'),
        sidebar: document.getElementById('dashSidebar'),
        sidebarCollapseBtn: document.getElementById('sidebarCollapseBtn'),
        mobileMenuToggle: document.getElementById('mobileMenuToggle'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        navButtons: document.querySelectorAll('.nav-item-btn'),
        views: document.querySelectorAll('.dash-view'),
        currentDateGreeting: document.getElementById('currentDateGreeting'),
        globalSearchInput: document.getElementById('globalSearchInput'),
        toastContainer: document.getElementById('toastContainer'),

        // Impersonation Elements
        impersonationBar: document.getElementById('impersonationBar'),
        previewUserName: document.getElementById('previewUserName'),
        exitPreviewBtn: document.getElementById('exitPreviewBtn'),
        topbarStatusText: document.getElementById('topbarStatusText'),
        topbarUserName: document.getElementById('topbarUserName'),
        topbarUserRole: document.getElementById('topbarUserRole'),
        topbarUserAvatar: document.getElementById('topbarUserAvatar'),
        accessRestrictedScreen: document.getElementById('accessRestrictedScreen'),
        restrictedSectionName: document.getElementById('restrictedSectionName'),
        restrictedReturnBtn: document.getElementById('restrictedReturnBtn'),

        // Users & Permissions Elements
        usersTableBody: document.getElementById('usersTableBody'),
        kpiTotalUsers: document.getElementById('kpiTotalUsers'),
        kpiOnlineUsers: document.getElementById('kpiOnlineUsers'),
        kpiClientAccounts: document.getElementById('kpiClientAccounts'),
        sidebarUsersCount: document.getElementById('sidebarUsersCount'),
        userFilterAllCount: document.getElementById('userFilterAllCount'),
        userSearchInput: document.getElementById('userSearchInput'),
        userRoleFilters: document.querySelectorAll('#userRoleFilters button'),
        simulateSignInBtn: document.getElementById('simulateSignInBtn'),
        openAddUserModalBtn: document.getElementById('openAddUserModalBtn'),

        // Permissions Modal
        permissionsModal: document.getElementById('permissionsModal'),
        permissionsForm: document.getElementById('permissionsForm'),
        permModalUserSub: document.getElementById('permModalUserSub'),
        permRoleGrid: document.getElementById('permRoleGrid'),
        permSectionChips: document.getElementById('permSectionChips'),
        permGrantsSummary: document.getElementById('permGrantsSummary'),
        permEmptyWarning: document.getElementById('permEmptyWarning'),
        permAdminNotice: document.getElementById('permAdminNotice'),

        // Add User Modal
        addUserModal: document.getElementById('addUserModal'),
        addUserForm: document.getElementById('addUserForm'),

        // Overview
        overviewProjectsTableBody: document.getElementById('overviewProjectsTableBody'),
        overviewLeadsContainer: document.getElementById('overviewLeadsContainer'),
        kpiVisits: document.getElementById('kpiVisits'),
        kpiProjects: document.getElementById('kpiProjects'),
        kpiLeads: document.getElementById('kpiLeads'),
        sidebarProjectsCount: document.getElementById('sidebarProjectsCount'),
        sidebarLeadsBadge: document.getElementById('sidebarLeadsBadge'),

        // Projects
        projectsGridContainer: document.getElementById('projectsGridContainer'),
        projectCategoryFilters: document.querySelectorAll('#projectCategoryFilters button'),
        projectSearchInput: document.getElementById('projectSearchInput'),
        addProjectBtn: document.getElementById('addProjectBtn'),
        openAddProjectModalBtn: document.getElementById('openAddProjectModalBtn'),
        addProjectModal: document.getElementById('addProjectModal'),
        addProjectForm: document.getElementById('addProjectForm'),

        // Inquiries
        inquiriesTableBody: document.getElementById('inquiriesTableBody'),
        totalLeadsCount: document.getElementById('totalLeadsCount'),
        unreadLeadsCount: document.getElementById('unreadLeadsCount'),
        leadsSearchInput: document.getElementById('leadsSearchInput'),
        leadsFilterAll: document.getElementById('leadsFilterAll'),
        leadsFilterUnread: document.getElementById('leadsFilterUnread'),
        leadsFilterReplied: document.getElementById('leadsFilterReplied'),
        replyInquiryModal: document.getElementById('replyInquiryModal'),
        replyInquiryForm: document.getElementById('replyInquiryForm'),
        replyModalClientName: document.getElementById('replyModalClientName'),
        replyModalClientEmail: document.getElementById('replyModalClientEmail'),
        replyModalOriginalMessage: document.getElementById('replyModalOriginalMessage'),
        exportLeadsCsvBtn: document.getElementById('exportLeadsCsvBtn'),

        // Testimonials
        testimonialsGridContainer: document.getElementById('testimonialsGridContainer'),
        testimonialFilterBtns: document.querySelectorAll('#testimonialFilterBtns button'),
        reviewSearchInput: document.getElementById('reviewSearchInput'),
        openAddTestimonialModalBtn: document.getElementById('openAddTestimonialModalBtn'),
        addTestimonialModal: document.getElementById('addTestimonialModal'),
        addTestimonialForm: document.getElementById('addTestimonialForm'),
        kpiTotalReviews: document.getElementById('kpiTotalReviews'),
        kpiAvgRating: document.getElementById('kpiAvgRating'),
        kpiFeaturedReviews: document.getElementById('kpiFeaturedReviews'),
        kpiPendingReviews: document.getElementById('kpiPendingReviews'),
        sidebarReviewsBadge: document.getElementById('sidebarReviewsBadge'),
        countAllReviews: document.getElementById('countAllReviews'),
        countFeaturedReviews: document.getElementById('countFeaturedReviews'),
        countPendingReviews: document.getElementById('countPendingReviews'),

        // Modals & Misc
        notificationBtn: document.getElementById('notificationBtn'),
        notificationsModal: document.getElementById('notificationsModal'),
        refreshDashboardBtn: document.getElementById('refreshDashboardBtn'),
        saveSettingsBtn: document.getElementById('saveSettingsBtn')
    };

    let activeEditingUserId = null;
    let activeReplyInquiryId = null;

    // --------------------------------------------------------------------------
    // 3. Theme Engine
    // --------------------------------------------------------------------------
    function applyTheme(theme) {
        state.theme = theme;
        elements.html.setAttribute('data-theme', theme);
        // Shared key with the public NenoTech site + login portal so a toggle
        // in any one of the three pages stays consistent across all of them.
        localStorage.setItem('nenotech_theme', theme);

        if (theme === 'light') {
            elements.themeToggleIcon.className = 'bi bi-moon-stars-fill text-primary';
            elements.themeToggleBtn.setAttribute('title', 'Switch to Dark Mode');
        } else {
            elements.themeToggleIcon.className = 'bi bi-sun-fill text-warning';
            elements.themeToggleBtn.setAttribute('title', 'Switch to Light Mode');
        }

        renderOverviewKPIs();
    }

    function toggleTheme() {
        // Determine current theme from the html element attribute (source of truth)
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const nextTheme = current === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        showToast('Theme Updated', `Switched to ${nextTheme === 'dark' ? 'Aurora Dark' : 'Frosted Light'} mode`, 'info');
    }

    // --------------------------------------------------------------------------
    // 4. Granular RBAC & Section Enforcement
    // --------------------------------------------------------------------------
    function isSectionAllowed(sectionKey) {
        // If Super Admin mode: everything allowed
        if (!state.currentViewingUser) return true;

        // In Impersonation mode: check user's allowedSections list
        const allowed = state.currentViewingUser.allowedSections || [];
        return allowed.includes(sectionKey);
    }

    function enforcePermissions() {
        if (!state.currentViewingUser) {
            // Super Admin Mode
            if (elements.impersonationBar) elements.impersonationBar.classList.remove('active');
            if (elements.topbarStatusText) elements.topbarStatusText.textContent = 'Super Admin Online';
            if (elements.topbarUserName) elements.topbarUserName.textContent = 'Husnain';
            if (elements.topbarUserRole) elements.topbarUserRole.textContent = 'Super Admin';
            if (elements.topbarUserAvatar) elements.topbarUserAvatar.src = 'ME.jpeg';

            // Show all nav items
            elements.navButtons.forEach(btn => {
                const li = btn.closest('li');
                if (li) li.style.display = 'block';
            });

            const superAdminNavGroup = document.getElementById('navSectionSuperAdmin');
            if (superAdminNavGroup) superAdminNavGroup.style.display = 'block';

            if (elements.accessRestrictedScreen) elements.accessRestrictedScreen.classList.add('d-none');
            return;
        }

        // Impersonation mode: only show sections allowed for the user
        const u = state.currentViewingUser;
        const allowedSections = Array.isArray(u.allowedSections) && u.allowedSections.length ? u.allowedSections : getDefaultAllowedSections(u.role || 'Viewer');

        if (elements.impersonationBar) elements.impersonationBar.classList.add('active');
        if (elements.previewUserName) elements.previewUserName.textContent = `${u.name} (${u.role})`;
        if (elements.topbarStatusText) elements.topbarStatusText.textContent = `Viewing as: ${u.name}`;
        if (elements.topbarUserName) elements.topbarUserName.textContent = u.name;
        if (elements.topbarUserRole) elements.topbarUserRole.textContent = u.role;

        // Hide the admin control section for non-admin impersonation
        const superAdminNavGroup = document.getElementById('navSectionSuperAdmin');
        if (superAdminNavGroup) superAdminNavGroup.style.display = 'none';

        elements.navButtons.forEach(btn => {
            const section = btn.getAttribute('data-section');
            const li = btn.closest('li');
            if (!li) return;

            if (section === 'users') {
                li.style.display = 'none';
                return;
            }

            li.style.display = allowedSections.includes(section) ? 'block' : 'none';
        });

        // If current view is not allowed, switch to first available allowed section.
        // If none are allowed, show lockout screen.
        if (!isSectionAllowed(state.activeView)) {
            const firstAllowed = allowedSections.find(s => s !== 'users') || 'overview';
            if (firstAllowed) {
                switchView(firstAllowed);
            } else {
                showLockoutScreen(state.activeView);
            }
        }
    }

    function showLockoutScreen(sectionName) {
        // Hide all views
        elements.views.forEach(v => v.classList.remove('active'));
        if (elements.accessRestrictedScreen) {
            elements.accessRestrictedScreen.classList.remove('d-none');
            if (elements.restrictedSectionName) {
                elements.restrictedSectionName.textContent = sectionName.toUpperCase();
            }
        }
    }

    // --------------------------------------------------------------------------
    // 5. View / Tab Router
    // --------------------------------------------------------------------------
    function switchView(viewId) {
        const effectiveView = viewId || 'overview';

        if (!isSectionAllowed(effectiveView)) {
            showLockoutScreen(effectiveView);
            showToast('Access Restricted', `Your account is not granted access to "${effectiveView}".`, 'info');
            return;
        }

        if (elements.accessRestrictedScreen) {
            elements.accessRestrictedScreen.classList.add('d-none');
        }

        state.activeView = effectiveView;

        elements.navButtons.forEach(btn => {
            const isActive = btn.getAttribute('data-view') === effectiveView;
            btn.classList.toggle('active', isActive);

            const li = btn.closest('li');
            if (li && state.currentViewingUser) {
                const section = btn.getAttribute('data-section');
                li.style.display = state.currentViewingUser.allowedSections.includes(section) ? 'block' : 'none';
            }
        });

        elements.views.forEach(view => {
            const shouldShow = view.id === `view-${effectiveView}`;
            view.classList.toggle('active', shouldShow);
        });

        document.body.classList.remove('sidebar-mobile-open');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (viewId === 'overview') {
            renderOverviewKPIs();
        }
    }

    // --------------------------------------------------------------------------
    // 6. User Management & Access Control Renderer
    // --------------------------------------------------------------------------
    function getDefaultAllowedSections(role) {
        switch (role) {
            case 'Super Admin':
                return ['users', 'overview', 'projects', 'inquiries', 'testimonials', 'settings'];
            case 'Project Client':
                return ['overview', 'projects', 'inquiries', 'testimonials'];
            case 'Developer':
                return ['overview', 'projects', 'testimonials'];
            case 'Viewer':
                return ['overview', 'testimonials'];
            default:
                return ['overview'];
        }
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function renderUsers(roleFilter = 'all', searchQuery = '') {
        const query = searchQuery.trim().toLowerCase();

        const filtered = state.users.filter(u => {
            let matchesRole = true;
            if (roleFilter === 'client') matchesRole = u.role === 'Project Client';
            else if (roleFilter === 'developer') matchesRole = u.role === 'Developer';
            else if (roleFilter === 'admin') matchesRole = u.role === 'Super Admin';
            else if (roleFilter === 'viewer') matchesRole = u.role === 'Viewer';

            const matchesQuery = query === '' ||
                String(u.name || '').toLowerCase().includes(query) ||
                String(u.email || '').toLowerCase().includes(query) ||
                String(u.role || '').toLowerCase().includes(query);

            return matchesRole && matchesQuery;
        });

        if (elements.usersTableBody) {
            if (filtered.length === 0) {
                elements.usersTableBody.innerHTML = `
                    <tr class="user-row-empty">
                        <td colspan="6">
                            <div class="user-empty-state">
                                <i class="bi bi-person-x fs-1 d-block mb-2 text-secondary"></i>
                                <div class="fw-semibold text-heading">No users found</div>
                                <div class="small">No users match your current filter or search criteria.</div>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                elements.usersTableBody.innerHTML = filtered.map(u => buildUserRow(u, SECTION_META)).join('');
            }
        }

        // Update KPIs
        const onlineCount = state.users.filter(u => u.status === 'online').length;
        const clientCount = state.users.filter(u => u.role === 'Project Client').length;

        if (elements.kpiTotalUsers) elements.kpiTotalUsers.textContent = state.users.length;
        if (elements.kpiOnlineUsers) elements.kpiOnlineUsers.textContent = onlineCount;
        if (elements.kpiClientAccounts) elements.kpiClientAccounts.textContent = clientCount;
        if (document.getElementById('kpiTotalUsersMini')) document.getElementById('kpiTotalUsersMini').textContent = state.users.length;
        if (document.getElementById('kpiOnlineUsersMini')) document.getElementById('kpiOnlineUsersMini').textContent = onlineCount;
        if (elements.sidebarUsersCount) elements.sidebarUsersCount.textContent = `${state.users.length} Users`;
        if (elements.userFilterAllCount) elements.userFilterAllCount.textContent = state.users.length;
    }

    function getRoleCardClass(role) {
        switch (role) {
            case 'Super Admin': return 'admin';
            case 'Developer': return 'developer';
            case 'Viewer': return 'viewer';
            default: return 'client';
        }
    }

    function buildUserRow(u, availableSections) {
        const numericId = Number(u.id);
        const safeId = Number.isFinite(numericId) ? numericId : -1;
        const initials = String(u.name || '?').trim().split(/\s+/).map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase() || '?';
        const isOnline = u.status === 'online';
        const statusClass = isOnline ? 'online' : 'offline';
        const roleClass = getRoleCardClass(u.role);
        const grantedSections = Array.isArray(u.allowedSections) ? u.allowedSections : [];

        // Compact role tag (Role column)
        const roleLabel = u.role === 'Project Client' ? 'Client'
            : u.role === 'Super Admin' ? 'Super Admin'
            : u.role === 'Developer' ? 'Developer'
            : 'Viewer';
        const roleTagHtml = `<span class="user-meta-role role-tag-${roleClass}">${esc(roleLabel)}</span>`;

        // Online status — text only, no icons
        const statusChipHtml = isOnline
            ? '<span class="status-chip online">Online</span>'
            : '<span class="status-chip offline">Offline</span>';

        // Passwords are never stored in this browser demo — but the eye still needs
        // a *stable* preview value so clicking it reveals something meaningful.
        // Deterministic per user (derived from id+email with a fixed salt) so it
        // looks identical after every reload, yet is clearly a demo token.
        const demoToken = String(u.id || '') + String(u.email || '');
        let seed = 0;
        for (let i = 0; i < demoToken.length; i++) seed = (seed * 31 + demoToken.charCodeAt(i)) >>> 0;
        const DEMO_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let demoPassword = '';
        let s = seed;
        for (let j = 0; j < 12; j++) {
            s = (s * 1103515245 + 12345) >>> 0;
            demoPassword += DEMO_CHARS[s % DEMO_CHARS.length];
        }
        const demoReal = 'demo·' + demoPassword + '·' + (u.role === 'Super Admin' ? 'su' : 'cn');
        const realPassword = String(u.password || '') || demoReal;
        const maskedPassword = String(u.password || '')
            ? String(u.password).replace(/[\s\S]/g, '•')
            : String((demoReal || 'demodemo' + demoPassword + 'demo').replace(/[\s\S]/g, '•') || '••••••••');

        // Access column — dropdown of toggleable sections
        let accessHtml = '';
        if (u.role === 'Super Admin') {
            accessHtml = '<span class="access-full"><i class="bi bi-shield-check"></i> Full Access</span>';
        } else {
            accessHtml = `
                <details class="access-dd" data-user-id="${safeId}">
                    <summary class="access-dd-summary" title="Configure granted sections — click to open">
                        <span class="access-dd-count">${grantedSections.length}/${availableSections.length}</span>
                        <i class="bi bi-chevron-down"></i>
                    </summary>
                    <div class="access-dd-menu">
                        ${availableSections.map(sec => {
                            const granted = grantedSections.includes(sec.key);
                            return `
                                <button type="button" class="access-dd-item ${granted ? 'granted' : 'revoked'}"
                                        data-section-key="${esc(sec.key)}"
                                        aria-pressed="${granted}"
                                        title="${granted ? 'Click to revoke' : 'Click to grant'} ${esc(sec.short)} access"
                                        onclick="window.dashHub.toggleUserSection(${safeId}, '${esc(sec.key)}')">
                                    <i class="bi bi-circle ic ic-idle"></i>
                                    <i class="bi bi-check-circle-fill ic ic-grant"></i>
                                    <i class="bi bi-x-circle-fill ic ic-revoke"></i>
                                    ${esc(sec.short)}
                                </button>
                            `;
                        }).join('')}
                    </div>
                </details>
            `;
        }

        return `
            <tr class="user-row role-${roleClass} is-${statusClass}" data-user-id="${safeId}">
                <td class="ur-cell ur-identity">
                    <div class="ur-identity-inner">
                        <div class="user-avatar-frame role-${roleClass}">${initials}</div>
                        <div class="ur-identity-text">
                            <div class="user-meta-name">${esc(u.name)}</div>
                            <div class="user-meta-email">${esc(u.email)}</div>
                        </div>
                    </div>
                </td>
                <td class="ur-cell ur-password">
                    <div class="ur-password-wrap">
                        <span class="ur-password-label" data-password-masked="${maskedPassword}"
                              data-password-real="${esc(String(u.password || '') || demoReal)}"
                              title="This browser demo never stores real passwords — click the eye to preview">${maskedPassword}</span>
                        <button type="button" class="action-icon-btn ur-password-toggle" title="Show password"
                                aria-label="Show password"
                                onclick="window.dashHub.togglePasswordVisibility(${safeId}, this)">
                            <i class="bi bi-eye-fill text-cyan"></i>
                        </button>
                        <button type="button" class="action-icon-btn ur-copy-btn" title="Copy password to clipboard"
                                aria-label="Copy password to clipboard" style="display:none"
                                onclick="window.dashHub.copyPassword(${safeId}, this)">
                            <i class="bi bi-files text-cyan" title="Copy this account's demo credential"></i>
                        </button>
                    </div>
                </td>
                <td class="ur-cell ur-role">${roleTagHtml}</td>
                <td class="ur-cell ur-status">${statusChipHtml}</td>
                <td class="ur-cell ur-access">${accessHtml}</td>
                <td class="ur-cell ur-actions">
                    <div class="ur-actions-row">
                        <button type="button" class="action-icon-btn" title="Test View: view dashboard as this user"
                                onclick="window.dashHub.impersonateUser(${safeId})">
                            <i class="bi bi-eye-fill text-cyan"></i>
                        </button>
                        <button type="button" class="action-icon-btn" title="Edit role & permissions"
                                onclick="window.dashHub.openPermissionsModal(${safeId})">
                            <i class="bi bi-pencil-fill text-secondary"></i>
                        </button>
                        ${u.role !== 'Super Admin' ? `
                            <button type="button" class="action-icon-btn danger" title="Delete account"
                                    onclick="window.dashHub.deleteUser(${safeId})">
                                <i class="bi bi-trash text-danger"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    function toggleUserSection(userId, sectionKey) {
        const u = state.users.find(item => item.id === userId);
        if (!u) return;

        if (!Array.isArray(u.allowedSections)) u.allowedSections = [];
        const index = u.allowedSections.indexOf(sectionKey);
        let action = '';

        if (index !== -1) {
            u.allowedSections.splice(index, 1);
            action = 'Revoked';
        } else {
            u.allowedSections.push(sectionKey);
            action = 'Granted';
        }

        persist('nenotech_users', state.users);

        // Preserve the active role filter & search query while re-rendering
        const activeFilterBtn = document.querySelector('#userRoleFilters button.active');
        const filter = activeFilterBtn ? activeFilterBtn.getAttribute('data-role-filter') : 'all';
        const query = elements.userSearchInput ? elements.userSearchInput.value : '';
        renderUsers(filter, query);

        // If this user is currently in Preview mode, update live view immediately
        if (state.currentViewingUser && state.currentViewingUser.id === u.id) {
            state.currentViewingUser = u;
            enforcePermissions();
        }

        showToast('Permission Updated', `${action} [${sectionKey.toUpperCase()}] section for ${esc(u.name)}`, action === 'Granted' ? 'success' : 'warning');
    }

    // --------------------------------------------------------------------------
    // 7. Permissions Modal Management
    // --------------------------------------------------------------------------
    const ROLE_META = [
        { value: 'Super Admin',    short: 'Super Admin', tagline: 'Full unrestricted control', icon: 'bi-shield-lock-fill', color: 'var(--accent-rose)' },
        { value: 'Project Client', short: 'Client',      tagline: 'Collaborates on projects',  icon: 'bi-person-badge',       color: 'var(--accent-cyan)' },
        { value: 'Developer',      short: 'Developer',   tagline: 'Builds & maintains code',   icon: 'bi-code-square',        color: 'var(--accent-amber)' },
        { value: 'Viewer',         short: 'Viewer',      tagline: 'Read-only access',          icon: 'bi-eye',                color: 'var(--accent-purple)' }
    ];

    // Current role selection inside the permissions modal
    let permFormRole = null;

    function getPermToggles() {
        if (!elements.permSectionChips) return [];
        return Array.from(elements.permSectionChips.querySelectorAll('.perm-section-toggle'));
    }

    function getSelectedRole() {
        return permFormRole || 'Viewer';
    }

    // Highlights the matching role chip and updates the whole form state.
    function setSelectedRole(role) {
        permFormRole = role || '';
        if (elements.permRoleGrid) {
            elements.permRoleGrid.querySelectorAll('.perm-role-chip').forEach(chip => {
                const active = chip.getAttribute('data-role-value') === permFormRole;
                chip.classList.toggle('is-selected', active);
                chip.setAttribute('aria-pressed', String(active));
            });
        }

        // Super Admin: full control — section chips become informational
        const isAdmin = permFormRole === 'Super Admin';
        if (elements.permAdminNotice) elements.permAdminNotice.hidden = !isAdmin;
        getPermToggles().forEach(toggle => { toggle.disabled = isAdmin; });

        updatePermWarnings();
        updateGrantsSummary();
    }

    function pickRole(role) {
        if (!canAssignSuperAdmin(role, activeEditingUserId || null)) return; // keep current selection
        setSelectedRole(role);
    }

    // Live "what will this user actually see" preview under the section chips.
    function updateGrantsSummary() {
        if (!elements.permGrantsSummary) return;
        const isAdmin = getSelectedRole() === 'Super Admin';
        const granted = getPermToggles()
            .filter(t => t.checked)
            .map(t => (SECTION_META.find(s => s.key === t.getAttribute('data-section-key')) || {}).short);

        let text, cls;
        if (isAdmin) {
            text = 'Full access — sees every section.';
            cls = 'is-admin';
        } else if (granted.length === 0) {
            text = 'No sections — empty workspace.';
            cls = 'is-empty';
        } else {
            text = `Can open: ${granted.join(', ')}`;
            cls = '';
        }

        elements.permGrantsSummary.textContent = text;
        elements.permGrantsSummary.classList.toggle('is-empty', cls === 'is-empty');
        elements.permGrantsSummary.classList.toggle('is-admin', cls === 'is-admin');
    }

    // Keeps the inline warnings in sync with the current form state.
    function updatePermWarnings() {
        if (!elements.permEmptyWarning) return;
        const checkedCount = getPermToggles().filter(t => t.checked).length;
        elements.permEmptyWarning.hidden = !(checkedCount === 0 && getSelectedRole() !== 'Super Admin');
    }

    // Renders the compact role + section chips once, from ROLE_META / SECTION_META.
    function initPermissionChips() {
        if (elements.permRoleGrid) {
            elements.permRoleGrid.innerHTML = ROLE_META.map(r => `
                <button type="button" class="perm-role-chip" data-role-value="${esc(r.value)}" aria-pressed="false"
                        title="${esc(r.tagline)}" onclick="window.dashHub.pickRole('${esc(r.value)}')">
                    <i class="bi ${r.icon}" style="color: ${r.color};"></i>
                    <span>
                        <span class="perm-role-name">${esc(r.short)}</span>
                        <span class="perm-role-sub">${esc(r.tagline)}</span>
                    </span>
                </button>
            `).join('');
        }

        if (elements.permSectionChips) {
            elements.permSectionChips.innerHTML = SECTION_META.map(sec => `
                <label class="perm-section-chip">
                    <input class="perm-section-toggle" type="checkbox" data-section-key="${esc(sec.key)}" aria-label="Toggle ${esc(sec.label)} access">
                    <i class="bi ${sec.icon}"></i>
                    ${esc(sec.short)}
                </label>
            `).join('');

            // Live warnings + result preview as chips are toggled
            elements.permSectionChips.addEventListener('change', () => {
                updatePermWarnings();
                updateGrantsSummary();
            });
        }
    }

    function openPermissionsModal(userId) {
        const u = state.users.find(item => item.id === userId);
        if (!u) return;

        activeEditingUserId = userId;
        if (elements.permModalUserSub) elements.permModalUserSub.textContent = `Editing ${u.name} · ${u.email}`;

        const isAdmin = u.role === 'Super Admin';

        setSelectedRole(u.role);

        // Sync chips to the user's current grants
        const allowed = u.allowedSections || [];
        getPermToggles().forEach(toggle => {
            const key = toggle.getAttribute('data-section-key');
            toggle.checked = isAdmin || allowed.includes(key);
            toggle.disabled = isAdmin;
        });

        updatePermWarnings();
        updateGrantsSummary();
        openModal('permissionsModal');
    }

    function canAssignSuperAdmin(role, currentUserId = null) {
        if (role !== 'Super Admin') return true;
        const existingSuperAdmin = state.users.find(u => u.role === 'Super Admin' && u.id !== currentUserId);
        if (existingSuperAdmin) {
            showToast('Single Super Admin Only', 'Only one user can be Super Admin at a time.', 'warning');
            return false;
        }
        return true;
    }

    function saveUserPermissions() {
        if (!activeEditingUserId) return;
        const u = state.users.find(item => item.id === activeEditingUserId);
        if (!u) return;

        const role = getSelectedRole();
        if (!canAssignSuperAdmin(role, u.id)) {
            setSelectedRole(u.role);
            return;
        }

        // Guard: demoting the last Super Admin would leave the system unmanageable.
        const otherAdmins = state.users.filter(x => x.role === 'Super Admin' && x.id !== u.id);
        if (u.role === 'Super Admin' && role !== 'Super Admin' && otherAdmins.length === 0) {
            const ok = window.confirm(
                'You are removing the last Super Admin from the system.\n' +
                'After this, no user will be able to manage roles or permissions.\n\nContinue?'
            );
            if (!ok) {
                setSelectedRole(u.role);
                return;
            }
        }

        const selectedSections = getPermToggles()
            .filter(toggle => toggle.checked)
            .map(toggle => toggle.getAttribute('data-section-key'));

        // Guard: saving with zero sections strands the user on an empty workspace.
        if (selectedSections.length === 0 && role !== 'Super Admin') {
            const ok = window.confirm(
                `${u.name} has no sections granted.\n` +
                'They will land on an empty workspace with nothing to open.\n\nSave anyway?'
            );
            if (!ok) return;
        }

        u.role = role;
        u.allowedSections = selectedSections;

        // Persist to localStorage
        persist('nenotech_users', state.users);

        renderUsers();
        closeModal('permissionsModal');

        // If this user is currently active in Preview mode, update live view immediately
        if (state.currentViewingUser && state.currentViewingUser.id === u.id) {
            state.currentViewingUser = u;
            enforcePermissions();
        }

        const sectionLabel = key => (SECTION_META.find(s => s.key === key) || {}).short || key;
        const friendly = selectedSections.map(sectionLabel).join(', ') || 'No sections';
        showToast('Permissions Saved', `Updated permissions for ${u.name}. Allowed: ${friendly}`, 'success');
    }

    // --------------------------------------------------------------------------
    // 8. Live Impersonation ("View As")
    // --------------------------------------------------------------------------
    function impersonateUser(userId) {
        const u = state.users.find(item => item.id === userId);
        if (!u) return;

        state.currentViewingUser = u;
        enforcePermissions();

        // Switch to the first allowed section of this user
        const firstAllowed = u.allowedSections.find(s => s !== 'users');
        if (firstAllowed) {
            switchView(firstAllowed);
        }

        showToast('Preview Mode Active', `Now viewing the dashboard through ${u.name}'s granted sections!`, 'info');
    }

    function copyPassword(safeId, btn) {
        // Climb the SAME proven seam as the eye (.ur-cell.ur-password) — the row
        // is built from ur-cell spans, NOT a .ur-row wrapper. Using .ur-row here
        // returned null and killed copy silently; mirroring the eye keeps the
        // copy button on the exact same source of truth as the reveal.
        const cell = btn && btn.closest('.ur-cell.ur-password');
        if (!cell) return;
        const label = cell.querySelector('.ur-password-label');
        if (!label) return;

        // Trust the SAME source of truth as the eye — never a fake/placeholder.
        const real = label.getAttribute('data-password-real') || '';
        if (!real) {
            showToast('Nothing to copy', 'No credential is stored for this demo account.', 'warning');
            return;
        }

        // Copy must be GUARANTEED inside the click gesture (desktop file:// pages
        // often have no secure-context clipboard API) — so the sync textarea path
        // runs first, and the async API only ever *reinforces* the same value.
        const copiedSync = function (text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            document.body.removeChild(ta);
            return ok;
        };

        const okNow = copiedSync(real);

        // Best-effort async boost for modern browsers; the sync write already landed.
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(real).catch(function () { /* sync already covered it */ });
        }

        // Tick + make the button disappear ONLY on a genuine write.
        const icon = btn && btn.querySelector('i');
        if (okNow) {
            if (icon) {
                icon.className = 'bi bi-check2 text-emerald';
                const cell = btn.closest('.ur-password-wrap');
                setTimeout(function () { if (cell) cell.style.display = 'none'; }, 900);
            }
            showToast('Credential Copied', 'Copied to clipboard. No real password was ever stored — it lives only in your clipboard after this action.', 'success');
        } else if (icon) {
            icon.className = 'bi bi-files text-cyan';
            showToast('Copy blocked', 'Your browser blocked the copy. Select and copy manually — nothing real was stored.', 'warning');
        }
    }

    // Brief "Copied ✓" feedback so the user knows it landed without breaking flow.
    function flashCopied(btn) {
        const icon = btn && btn.querySelector('i');
        const old = icon ? icon.className : '';
        if (icon) icon.className = 'bi bi-check2 text-cyan';
        showToast('Credential Copied', 'Copied to clipboard. No real password was ever stored — it lives only in your clipboard after this action.', 'success');
        setTimeout(function () { if (icon && icon.className === 'bi bi-check2 text-cyan') icon.className = old; }, 1400);
    }

    function togglePasswordVisibility(safeId, btn) {
        const label = btn && btn.closest('.ur-cell.ur-password')
                          ? btn.closest('.ur-cell.ur-password').querySelector('.ur-password-label')
                          : null;
        if (!label) return;

        const masked = label.getAttribute('data-password-masked');
        const real = label.getAttribute('data-password-real');
        const isMasked = label.dataset.revealed !== 'true';

        if (isMasked) {
            label.dataset.revealed = 'true';
            label.textContent = real;
            label.title = 'Hover this demo page - passwords are never stored. Click the eye to hide again.';
            btn.setAttribute('title', 'Hide password');
            btn.setAttribute('aria-label', 'Hide password');
            const icon = btn.querySelector('i');
            if (icon) icon.className = 'bi bi-eye-slash-fill text-secondary';
            // Copy is only meaningful when the real value is visible — reveal it
            // alongside the unmasking so it shares the eye's reveal state exactly.
            const pwWrap = btn.closest('.ur-password-wrap');
            const copyBtn = pwWrap ? pwWrap.querySelector('.ur-copy-btn') : null;
            if (copyBtn) copyBtn.style.display = 'inline-flex';
        } else {
            delete label.dataset.revealed;
            label.textContent = masked;
            label.title = 'This browser demo never stores real passwords — click the eye to preview';
            btn.setAttribute('title', 'Show password');
            btn.setAttribute('aria-label', 'Show password');
            const icon = btn.querySelector('i');
            if (icon) icon.className = 'bi bi-eye-fill text-cyan';
            // Re-mask: hide the copy button again so it can't copy a hidden value.
            const pwWrap = btn.closest('.ur-password-wrap');
            const copyBtn = pwWrap ? pwWrap.querySelector('.ur-copy-btn') : null;
            if (copyBtn) copyBtn.style.display = 'none';
        }
    }

    function exitImpersonation() {
        state.currentViewingUser = null;
        enforcePermissions();
        switchView('users');
        showToast('Super Admin Restored', 'Full system access returned to Husnain (Super Admin)', 'success');
    }

    // --------------------------------------------------------------------------
    // 9. Real-Time Sign-In Listener & Simulation
    // --------------------------------------------------------------------------
    function handleExternalAuthEvent(eventData) {
        if (!eventData || !eventData.email) return;

        const email = eventData.email.toLowerCase();
        let existing = state.users.find(u => u.email.toLowerCase() === email);

        if (!existing) {
            existing = {
                id: Date.now(),
                name: eventData.name || email.split('@')[0],
                email: email,
                role: 'Project Client',
                status: 'online',
                lastSignIn: 'Just now',
                device: 'Browser Portal',
                allowedSections: ['projects', 'inquiries'],
                createdAt: new Date().toISOString().slice(0, 10)
            };
            state.users.unshift(existing);
        } else {
            existing.status = 'online';
            existing.lastSignIn = 'Active now';
            if (eventData.name && !existing.name) existing.name = eventData.name;
        }

        persist('nenotech_users', state.users);
        renderUsers();

        // Sound / visual toast notification
        showToast('Live User Sign-In', `${existing.name} (${existing.email}) just signed in to NenoTech website!`, 'success');
    }

    function simulateUserSignIn() {
        const candidate = state.users.find(u => u.status === 'offline' && u.role !== 'Super Admin');

        if (candidate) {
            candidate.status = 'online';
            candidate.lastSignIn = 'Active now';
            persist('nenotech_users', state.users);
            renderUsers();
            showToast('Sign-In Simulation', `${candidate.name} (${candidate.email}) signed in from mobile browser!`, 'success');
        } else {
            // Create a brand new client registration
            const sampleNames = ['Elena Rostova', 'Marcus Vance', 'Amina Zahra', 'Liam O\'Connor'];
            const sampleName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
            const sampleEmail = `${sampleName.toLowerCase().replace(/[^a-z]/g, '')}@techclient.io`;

            const newUser = {
                id: Date.now(),
                name: sampleName,
                email: sampleEmail,
                role: 'Project Client',
                status: 'online',
                lastSignIn: 'Active now',
                device: 'iPhone 15 Pro • Safari',
                allowedSections: ['projects', 'inquiries'],
                createdAt: new Date().toISOString().slice(0, 10)
            };

            state.users.unshift(newUser);
            persist('nenotech_users', state.users);
            renderUsers();
            showToast('New Client Registration', `${sampleName} registered and signed in to NenoTech portal!`, 'success');
        }
    }

    // --------------------------------------------------------------------------
    // 11. Projects & Leads Renderers
    // --------------------------------------------------------------------------
    function getStatusBadge(status) {
        switch (status) {
            case 'deployed':
                return '<span class="status-pill deployed"><i class="bi bi-rocket-takeoff-fill"></i> Deployed</span>';
            case 'in-progress':
                return '<span class="status-pill in-progress"><i class="bi bi-arrow-repeat"></i> In Progress</span>';
            case 'review':
                return '<span class="status-pill review"><i class="bi bi-eye-fill"></i> In Review</span>';
            default:
                return `<span class="status-pill in-progress">${status}</span>`;
        }
    }

    function renderProjects(filter = 'all', searchQuery = '') {
        const query = searchQuery.trim().toLowerCase();

        const filtered = state.projects.filter(p => {
            const matchesFilter = filter === 'all' || p.status === filter;
            const matchesQuery = query === '' ||
                String(p.title || '').toLowerCase().includes(query) ||
                (p.tags || []).some(t => String(t).toLowerCase().includes(query)) ||
                String(p.desc || '').toLowerCase().includes(query);
            return matchesFilter && matchesQuery;
        });

        if (elements.projectsGridContainer) {
            if (filtered.length === 0) {
                elements.projectsGridContainer.innerHTML = `
                    <div class="col-12 py-5 text-center text-muted">
                        <i class="bi bi-folder-x fs-1 d-block mb-2 text-secondary"></i>
                        <h5>No projects found</h5>
                        <p class="small">Try adjusting your filter or search criteria.</p>
                    </div>
                `;
            } else {
                elements.projectsGridContainer.innerHTML = filtered.map(p => `
                    <div class="dash-card project-mgmt-card">
                        <div class="project-card-banner">
                            <img src="${esc(p.image)}" alt="${esc(p.title)}" class="project-banner-img" onerror="this.src='bg-aurora.jpg'">
                            <div class="project-badge-overlay">
                                ${getStatusBadge(p.status)}
                            </div>
                        </div>

                        <div class="d-flex flex-column flex-grow-1">
                            <h3 class="h6 fw-bold mb-1 text-heading">${esc(p.title)}</h3>
                            <span class="small text-muted mb-2">Client: <strong>${esc(p.client)}</strong></span>
                            <p class="small text-secondary mb-3 flex-grow-1">${esc(p.desc)}</p>

                            <div class="project-tags-wrap">
                                ${p.tags.map(t => `<span class="tag-badge">${esc(t)}</span>`).join('')}
                            </div>

                            <div class="project-progress-wrap">
                                <div class="project-progress-header">
                                    <span class="text-secondary">Milestone Progress</span>
                                    <span class="fw-bold text-heading">${Number(p.progress) || 0}%</span>
                                </div>
                                <div class="progress-track">
                                    <div class="progress-fill" style="width: ${Number(p.progress) || 0}%;"></div>
                                </div>
                            </div>

                            <div class="d-flex align-items-center justify-content-between pt-3 border-top border-secondary border-opacity-25 mt-2">
                                <span class="small text-muted"><i class="bi bi-clock me-1"></i> Updated today</span>
                                <div class="d-flex gap-2">
                                    <button class="action-icon-btn" title="View Details" onclick="window.dashHub.viewProjectDetails(${Number(p.id)})">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="action-icon-btn" title="Quick Edit" onclick="window.dashHub.editProject(${Number(p.id)})">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }

        if (elements.overviewProjectsTableBody) {
            const overviewSlice = state.projects.slice(0, 4);
            elements.overviewProjectsTableBody.innerHTML = overviewSlice.map(p => `
                <tr>
                    <td class="fw-bold text-heading">
                        <div class="d-flex align-items-center gap-2">
                            <img src="${esc(p.image)}" alt="${esc(p.title)}" style="width: 28px; height: 28px; border-radius: 6px; object-fit: cover;" onerror="this.src='clipboard.ico'">
                            <span>${esc(p.title)}</span>
                        </div>
                    </td>
                    <td>
                        <span class="tag-badge">${esc(p.tags[0] || 'Web')}</span>
                        <span class="tag-badge">${esc(p.tags[1] || 'CSS')}</span>
                    </td>
                    <td style="min-width: 130px;">
                        <div class="d-flex align-items-center gap-2">
                            <div class="quota-progress flex-grow-1 mb-0" style="height: 6px;">
                                <div class="quota-bar" style="width: ${Number(p.progress) || 0}%;"></div>
                            </div>
                            <span class="small fw-semibold text-heading">${Number(p.progress) || 0}%</span>
                        </div>
                    </td>
                    <td>${getStatusBadge(p.status)}</td>
                </tr>
            `).join('');
        }

        if (elements.sidebarProjectsCount) elements.sidebarProjectsCount.textContent = state.projects.length;
        if (elements.kpiProjects) elements.kpiProjects.textContent = state.projects.length;
    }

    function renderInquiries(filter = 'all', searchQuery = '') {
        const query = searchQuery.trim().toLowerCase();

        const filtered = state.inquiries.filter(i => {
            const matchesFilter = filter === 'all' || i.status === filter;
            const matchesQuery = query === '' ||
                String(i.name || '').toLowerCase().includes(query) ||
                String(i.company || '').toLowerCase().includes(query) ||
                String(i.subject || '').toLowerCase().includes(query) ||
                String(i.email || '').toLowerCase().includes(query);
            return matchesFilter && matchesQuery;
        });

        if (elements.inquiriesTableBody) {
            if (filtered.length === 0) {
                elements.inquiriesTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="py-5 text-center text-muted">
                            <i class="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
                            No inquiries match your current filter.
                        </td>
                    </tr>
                `;
            } else {
                elements.inquiriesTableBody.innerHTML = filtered.map(i => {
                    const statusBadge = i.status === 'unread'
                        ? '<span class="status-pill unread"><i class="bi bi-envelope-fill"></i> Unread</span>'
                        : '<span class="status-pill replied"><i class="bi bi-check-all"></i> Replied</span>';

                    return `
                        <tr style="${i.status === 'unread' ? 'background: rgba(59, 130, 246, 0.04);' : ''}">
                            <td>
                                <div class="fw-bold text-heading">${esc(i.name)}</div>
                                <div class="small text-muted">${esc([i.email, i.company].filter(Boolean).join(' • '))}</div>
                            </td>
                            <td>
                                <div class="fw-semibold text-heading">${esc(i.subject)}</div>
                                <div class="small text-secondary text-truncate" style="max-width: 280px;">${esc(i.message)}</div>
                            </td>
                            <td>
                                <span class="badge bg-secondary bg-opacity-25 text-heading">${esc(i.budget) || '—'}</span>
                            </td>
                            <td>${statusBadge}</td>
                            <td class="small text-muted">${esc(i.time)}</td>
                            <td class="text-end">
                                <div class="d-flex justify-content-end gap-2">
                                    <button class="action-icon-btn" title="Reply to Lead" onclick="window.dashHub.openReplyModal(${Number(i.id)})">
                                        <i class="bi bi-reply-fill text-cyan"></i>
                                    </button>
                                    <button class="action-icon-btn" title="Toggle Read Status" onclick="window.dashHub.toggleInquiryRead(${Number(i.id)})">
                                        <i class="bi ${i.status === 'unread' ? 'bi-envelope-check' : 'bi-envelope'}"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        if (elements.overviewLeadsContainer) {
            const overviewLeads = state.inquiries.slice(0, 3);
            elements.overviewLeadsContainer.innerHTML = overviewLeads.map(i => `
                <div class="p-3 rounded-3" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-bold text-heading small">${esc(i.name)} <span class="text-muted fw-normal">(${esc(i.company)})</span></span>
                        <span class="small text-muted">${esc(i.time)}</span>
                    </div>
                    <div class="small text-secondary mb-2 text-truncate">${esc(i.subject)}</div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="small text-cyan fw-semibold">${esc(i.budget)}</span>
                        <button class="btn btn-sm btn-link text-decoration-none text-cyan p-0 small" onclick="window.dashHub.openReplyModal(${Number(i.id)})">
                            <i class="bi bi-reply"></i> Reply
                        </button>
                    </div>
                </div>
            `).join('');
        }

        const unreadCount = state.inquiries.filter(i => i.status === 'unread').length;
        if (elements.totalLeadsCount) elements.totalLeadsCount.textContent = state.inquiries.length;
        if (elements.unreadLeadsCount) elements.unreadLeadsCount.textContent = unreadCount;
        if (elements.sidebarLeadsBadge) elements.sidebarLeadsBadge.textContent = `${unreadCount} New`;
        if (elements.kpiLeads) elements.kpiLeads.textContent = state.inquiries.length;

        // Update overview KPI panel
        renderOverviewKPIs();
    }

    // --------------------------------------------------------------------------
    // 11c. Overview KPI Panel Renderer (real data only)
    // --------------------------------------------------------------------------
    function renderOverviewKPIs() {
        const onlineCount = state.users.filter(u => u.status === 'online').length;
        const totalUsers = state.users.length;
        const totalProjects = state.projects.length;
        const deployedCount = state.projects.filter(p => p.status === 'deployed').length;
        const totalLeads = state.inquiries.length;
        const unreadLeads = state.inquiries.filter(i => i.status === 'unread').length;
        const totalReviews = state.testimonials.length;
        const featuredReviews = state.testimonials.filter(t => t.featured).length;

        // Stat 1: Registered Users
        const kpiVisitsEl = document.getElementById('kpiVisits');
        if (kpiVisitsEl) kpiVisitsEl.textContent = totalUsers;
        const kpiOnlineEl = document.getElementById('kpiOnlineOverview');
        if (kpiOnlineEl) kpiOnlineEl.textContent = onlineCount;

        // Stat 2: Projects
        if (elements.kpiProjects) elements.kpiProjects.textContent = totalProjects;
        const kpiProjStatusEl = document.getElementById('kpiProjectsStatus');
        if (kpiProjStatusEl) kpiProjStatusEl.textContent = `${deployedCount} Deployed`;

        // Stat 3: Inquiries
        if (elements.kpiLeads) elements.kpiLeads.textContent = totalLeads;
        const kpiLeadsPendingEl = document.getElementById('kpiLeadsPending');
        if (kpiLeadsPendingEl) kpiLeadsPendingEl.textContent = `${unreadLeads} Unread`;

        // Stat 4: Reviews
        const kpiSatisfactionEl = document.getElementById('kpiSatisfaction');
        if (kpiSatisfactionEl) kpiSatisfactionEl.textContent = totalReviews;
        const kpiFeaturedEl = document.getElementById('kpiFeaturedOverview');
        if (kpiFeaturedEl) kpiFeaturedEl.textContent = `${featuredReviews} Live on Site`;
    }

    // --------------------------------------------------------------------------
    // 11b. Testimonials & Client Reviews Management
    // --------------------------------------------------------------------------
    function renderTestimonials(filter = 'all', searchQuery = '') {
        const query = searchQuery.trim().toLowerCase();

        const filtered = state.testimonials.filter(t => {
            let matchesFilter = true;
            if (filter === 'featured') matchesFilter = t.featured === true;
            else if (filter === 'pending') matchesFilter = t.featured === false;

            const matchesQuery = query === '' ||
                String(t.clientName || '').toLowerCase().includes(query) ||
                String(t.company || '').toLowerCase().includes(query) ||
                String(t.project || '').toLowerCase().includes(query) ||
                String(t.quote || '').toLowerCase().includes(query);

            return matchesFilter && matchesQuery;
        });

        if (elements.testimonialsGridContainer) {
            if (filtered.length === 0) {
                elements.testimonialsGridContainer.innerHTML = `
                    <div class="col-12 py-5 text-center text-muted">
                        <i class="bi bi-chat-square-quote fs-1 d-block mb-2 text-secondary"></i>
                        No client reviews match your selected filter.
                    </div>
                `;
            } else {
                elements.testimonialsGridContainer.innerHTML = filtered.map(t => {
                    const initials = String(t.clientName || '?').trim().split(/\s+/).map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase() || '?';
                    const rating = Math.max(0, Math.min(5, Number(t.rating) || 0));
                    const starsHtml = '★'.repeat(rating) + '☆'.repeat(5 - rating);
                    const isFeatured = t.featured;
                    const numericId = Number(t.id);

                    return `
                        <div class="col-md-6 col-lg-4">
                            <div class="testimonial-admin-card">
                                <div>
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <div class="review-stars">${starsHtml}</div>
                                        <span class="badge ${isFeatured ? 'bg-success bg-opacity-25 text-emerald' : 'bg-warning bg-opacity-25 text-warning'} small">
                                            <i class="bi ${isFeatured ? 'bi-check-circle-fill' : 'bi-hourglass-split'} me-1"></i>
                                            ${isFeatured ? 'Featured on Site' : 'Pending Review'}
                                        </span>
                                    </div>
                                    <p class="text-secondary small fst-italic mb-3" style="min-height: 58px;">
                                        "${esc(t.quote)}"
                                    </p>
                                    <div class="mb-3">
                                        <span class="tag-badge"><i class="bi bi-folder-fill me-1"></i>${esc(t.project || 'Web App')}</span>
                                    </div>
                                </div>
                                <div class="pt-3 border-top border-secondary border-opacity-25 d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center gap-2">
                                        <div class="testimonial-client-avatar bg-primary">
                                            ${initials}
                                        </div>
                                        <div>
                                            <div class="fw-bold text-heading small">${esc(t.clientName)}</div>
                                            <div class="text-muted" style="font-size: 0.72rem;">${esc(t.role)}, ${esc(t.company)}</div>
                                        </div>
                                    </div>
                                    <div class="d-flex gap-1">
                                        <button class="action-icon-btn" 
                                                title="${isFeatured ? 'Un-feature from Website' : 'Approve & Feature Live on Website'}" 
                                                onclick="window.dashHub.toggleTestimonialFeatured(${numericId})">
                                            <i class="bi ${isFeatured ? 'bi-eye-slash-fill text-secondary' : 'bi-check2-circle text-emerald'}"></i>
                                        </button>
                                        <button class="action-icon-btn" title="Delete Review" onclick="window.dashHub.deleteTestimonial(${numericId})">
                                            <i class="bi bi-trash text-danger"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // Update KPIs
        const total = state.testimonials.length;
        const featuredCount = state.testimonials.filter(t => t.featured).length;
        const pendingCount = total - featuredCount;

        if (elements.kpiTotalReviews) elements.kpiTotalReviews.textContent = total;
        if (elements.kpiFeaturedReviews) elements.kpiFeaturedReviews.textContent = featuredCount;
        if (elements.kpiPendingReviews) elements.kpiPendingReviews.textContent = pendingCount;
        if (elements.sidebarReviewsBadge) elements.sidebarReviewsBadge.textContent = `${total} Reviews`;
        if (elements.countAllReviews) elements.countAllReviews.textContent = total;
        if (elements.countFeaturedReviews) elements.countFeaturedReviews.textContent = featuredCount;
        if (elements.countPendingReviews) elements.countPendingReviews.textContent = pendingCount;

        // Update overview KPI panel
        renderOverviewKPIs();
    }

    function toggleTestimonialFeatured(id) {
        const item = state.testimonials.find(t => t.id === id);
        if (!item) return;

        item.featured = !item.featured;
        persist('nenotech_testimonials', state.testimonials);

        const activeFilterBtn = document.querySelector('#testimonialFilterBtns button.active');
        const filter = activeFilterBtn ? activeFilterBtn.getAttribute('data-review-filter') : 'all';
        renderTestimonials(filter);

        showToast(
            'Review Moderation',
            item.featured 
                ? `Review by ${esc(item.clientName)} is now FEATURED on NenoTech website!` 
                : `Review by ${esc(item.clientName)} is set to pending approval.`,
            item.featured ? 'success' : 'info'
        );
    }

    function deleteTestimonial(id) {
        const item = state.testimonials.find(t => t.id === id);
        if (!item) return;

        if (confirm(`Are you sure you want to delete the testimonial from "${item.clientName}"?`)) {
            state.testimonials = state.testimonials.filter(t => t.id !== id);
            persist('nenotech_testimonials', state.testimonials);

            const activeFilterBtn = document.querySelector('#testimonialFilterBtns button.active');
            const filter = activeFilterBtn ? activeFilterBtn.getAttribute('data-review-filter') : 'all';
            renderTestimonials(filter);

            showToast('Review Removed', `Deleted testimonial by ${esc(item.clientName)}`, 'info');
        }
    }

    // --------------------------------------------------------------------------
    // 12. Toast Notification Engine
    // --------------------------------------------------------------------------
    function showToast(title, message, type = 'success') {
        if (!elements.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `dash-toast toast-${type}`;
        const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-info-circle-fill';

        toast.innerHTML = `
            <i class="bi ${icon} toast-icon"></i>
            <div class="toast-msg-wrap">
                <div class="toast-title">${esc(title)}</div>
                <div class="toast-text">${esc(message)}</div>
            </div>
            <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:2px;" onclick="this.parentElement.remove()">
                <i class="bi bi-x"></i>
            </button>
        `;

        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // --------------------------------------------------------------------------
    // 13. Modals Helper
    // --------------------------------------------------------------------------
    let lastFocusedElement = null;

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal || modal.classList.contains('active')) return;

        lastFocusedElement = document.activeElement;
        modal.classList.add('active');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        document.body.style.overflow = 'hidden';

        // Move focus into the modal (first focusable control)
        const focusable = modal.querySelector('input, select, textarea, button, [tabindex]:not([tabindex="-1"])');
        if (focusable) focusable.focus();
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';

        // Restore focus to whatever was focused before the modal opened
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            try { lastFocusedElement.focus(); } catch (e) { /* ignore */ }
        }
    }

    // --------------------------------------------------------------------------
    // 14. Public API for Onclick Handlers
    // --------------------------------------------------------------------------
    window.dashHub = {
        openPermissionsModal: openPermissionsModal,
        impersonateUser: impersonateUser,
        togglePasswordVisibility: togglePasswordVisibility,
        copyPassword: copyPassword,
        deleteUser: function (userId) {
            const u = state.users.find(item => item.id === userId);
            if (!u || u.role === 'Super Admin') return;

            if (confirm(`Are you sure you want to delete user account "${u.name}"?`)) {
                state.users = state.users.filter(item => item.id !== userId);
                persist('nenotech_users', state.users);

                // If the deleted user was being impersonated, restore Super Admin mode
                if (state.currentViewingUser && state.currentViewingUser.id === userId) {
                    state.currentViewingUser = null;
                }

                const activeFilterBtn = document.querySelector('#userRoleFilters button.active');
                const filter = activeFilterBtn ? activeFilterBtn.getAttribute('data-role-filter') : 'all';
                const query = elements.userSearchInput ? elements.userSearchInput.value : '';
                renderUsers(filter, query);
                enforcePermissions();
                showToast('Account Removed', `User "${esc(u.name)}" was deleted.`, 'info');
            }
        },

        openReplyModal: function (inquiryId) {
            const item = state.inquiries.find(i => i.id === inquiryId);
            if (!item) return;

            activeReplyInquiryId = inquiryId;
            if (elements.replyModalClientName) elements.replyModalClientName.textContent = `${item.name} (${item.company})`;
            if (elements.replyModalClientEmail) elements.replyModalClientEmail.textContent = item.email;
            if (elements.replyModalOriginalMessage) elements.replyModalOriginalMessage.textContent = `"${item.message}"`;

            openModal('replyInquiryModal');
        },

        toggleInquiryRead: function (inquiryId) {
            const item = state.inquiries.find(i => i.id === inquiryId);
            if (!item) return;

            item.status = item.status === 'unread' ? 'replied' : 'unread';
            persist('nenotech_inquiries', state.inquiries);
            renderInquiries();
            showToast('Inquiry Status', `Marked message as ${item.status}`, 'info');
        },

        viewProjectDetails: function (projectId) {
            const p = state.projects.find(i => i.id === projectId);
            if (!p) return;
            showToast(p.title, `Client: ${p.client} • Status: ${p.status.toUpperCase()} (${p.progress}% completed)`, 'info');
        },

        editProject: function (projectId) {
            const p = state.projects.find(i => i.id === projectId);
            if (!p) return;
            showToast('Edit Project', `Opening configuration for "${p.title}"...`, 'info');
        },

        toggleUserSection: toggleUserSection,
        toggleTestimonialFeatured: toggleTestimonialFeatured,
        deleteTestimonial: deleteTestimonial,
        pickRole: pickRole
    };

    // --------------------------------------------------------------------------
    // 15. Event Listeners Setup
    // --------------------------------------------------------------------------
    function setupEventListeners() {
        // Theme Toggle
        if (elements.themeToggleBtn) {
            elements.themeToggleBtn.addEventListener('click', toggleTheme);
        }

        // Impersonation Exit Button
        if (elements.exitPreviewBtn) {
            elements.exitPreviewBtn.addEventListener('click', exitImpersonation);
        }

        // Return from Lockout Button
        if (elements.restrictedReturnBtn) {
            elements.restrictedReturnBtn.addEventListener('click', () => {
                if (state.currentViewingUser) {
                    const first = state.currentViewingUser.allowedSections[0];
                    if (first) switchView(first);
                    else exitImpersonation();
                } else {
                    switchView('overview');
                }
            });
        }

        // Sidebar Navigation
        elements.navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                if (view) {
                    switchView(view);
                    if (window.innerWidth <= 1024) {
                        document.body.classList.remove('sidebar-mobile-open');
                    }
                }
            });
        });

        // Quick switch links with data-switch-tab
        document.querySelectorAll('[data-switch-tab]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = el.getAttribute('data-switch-tab');
                if (tab) switchView(tab);
            });
        });

        // Close modals when clicking the dark backdrop (not the dialog itself)
        document.querySelectorAll('.dash-modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) closeModal(backdrop.id);
            });
        });

        // Brand click
        const brandLink = document.getElementById('brandHomeLink');
        if (brandLink) {
            brandLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (document.body.classList.contains('sidebar-collapsed')) {
                    document.body.classList.remove('sidebar-collapsed');
                } else {
                    switchView('users');
                }
            });
        }

        // Sidebar desktop collapse
        if (elements.sidebarCollapseBtn) {
            elements.sidebarCollapseBtn.addEventListener('click', () => {
                document.body.classList.toggle('sidebar-collapsed');
            });
        }

        // Mobile drawer hamburger toggle
        if (elements.mobileMenuToggle) {
            elements.mobileMenuToggle.addEventListener('click', () => {
                document.body.classList.toggle('sidebar-mobile-open');
            });
        }

        // Tap overlay to close mobile sidebar
        if (elements.sidebarOverlay) {
            elements.sidebarOverlay.addEventListener('click', () => {
                document.body.classList.remove('sidebar-mobile-open');
            });
        }

        // Simulate User Sign-in
        if (elements.simulateSignInBtn) {
            elements.simulateSignInBtn.addEventListener('click', simulateUserSignIn);
        }

        // Open Add User Modal
        if (elements.openAddUserModalBtn) {
            elements.openAddUserModalBtn.addEventListener('click', () => openModal('addUserModal'));
        }

        // Add User Form Submit
        if (elements.addUserForm) {
            elements.addUserForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const nameInput = document.getElementById('newUserName');
                const emailInput = document.getElementById('newUserEmail');
                const roleSelect = document.getElementById('newUserRole');

                const name = nameInput.value.trim();
                const email = emailInput.value.trim().toLowerCase();
                const role = roleSelect.value;

                if (!name) {
                    showToast('Validation Error', 'User name is required.', 'warning');
                    nameInput.focus();
                    return;
                }

                if (!isValidEmail(email)) {
                    showToast('Validation Error', 'Please enter a valid email address.', 'warning');
                    emailInput.focus();
                    return;
                }

                const existingUser = state.users.some(u => u.email.toLowerCase() === email);
                if (existingUser) {
                    showToast('Duplicate User', 'A user with this email already exists.', 'warning');
                    emailInput.focus();
                    return;
                }

                if (!canAssignSuperAdmin(role)) {
                    return;
                }

                const allowedSections = [];
                if (document.getElementById('addCheckOverview') && document.getElementById('addCheckOverview').checked) allowedSections.push('overview');
                if (document.getElementById('addCheckProjects') && document.getElementById('addCheckProjects').checked) allowedSections.push('projects');
                if (document.getElementById('addCheckInquiries') && document.getElementById('addCheckInquiries').checked) allowedSections.push('inquiries');
                const testimonialsCheck = document.getElementById('addCheckTestimonials');
                if (testimonialsCheck && testimonialsCheck.checked) allowedSections.push('testimonials');
                if (document.getElementById('addCheckSettings') && document.getElementById('addCheckSettings').checked) allowedSections.push('settings');

                if (allowedSections.length === 0) {
                    const defaultSections = getDefaultAllowedSections(role);
                    defaultSections.forEach(section => {
                        if (!allowedSections.includes(section)) allowedSections.push(section);
                    });
                }

                if (role === 'Super Admin') {
                    allowedSections.splice(0, allowedSections.length, ...getDefaultAllowedSections(role));
                }

                const newUser = {
                    id: Date.now(),
                    name,
                    email,
                    role,
                    status: 'online',
                    lastSignIn: 'Just now',
                    device: (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || 'Web Client',
                    allowedSections,
                    createdAt: new Date().toISOString().slice(0, 10)
                };

                state.users.unshift(newUser);
                persist('nenotech_users', state.users);
                renderUsers();
                closeModal('addUserModal');
                elements.addUserForm.reset();
                showToast('User Created', `Account created for ${name} with [${allowedSections.join(', ')}] access.`, 'success');
            });
        }

        // User Search
        if (elements.userSearchInput) {
            elements.userSearchInput.addEventListener('input', debounce((e) => {
                const activeFilterBtn = document.querySelector('#userRoleFilters button.active');
                const filter = activeFilterBtn ? activeFilterBtn.getAttribute('data-role-filter') : 'all';
                renderUsers(filter, e.target.value);
            }, 200));
        }

        // User Role Filter Buttons
        elements.userRoleFilters.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.userRoleFilters.forEach(b => {
                    b.classList.remove('dash-btn-primary', 'active');
                    b.classList.add('dash-btn-glass');
                });
                btn.classList.remove('dash-btn-glass');
                btn.classList.add('dash-btn-primary', 'active');

                const filter = btn.getAttribute('data-role-filter');
                const query = elements.userSearchInput ? elements.userSearchInput.value : '';
                renderUsers(filter, query);
            });
        });

        // Permission Form Submit
        if (elements.permissionsForm) {
            elements.permissionsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                saveUserPermissions();
            });
        }

        // Render compact role + section chips from ROLE_META / SECTION_META
        initPermissionChips();

        // Projects Filter
        elements.projectCategoryFilters.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.projectCategoryFilters.forEach(b => {
                    b.classList.remove('dash-btn-primary', 'active');
                    b.classList.add('dash-btn-glass');
                });
                btn.classList.remove('dash-btn-glass');
                btn.classList.add('dash-btn-primary', 'active');

                const filter = btn.getAttribute('data-filter');
                const query = elements.projectSearchInput ? elements.projectSearchInput.value : '';
                renderProjects(filter, query);
            });
        });

        if (elements.projectSearchInput) {
            elements.projectSearchInput.addEventListener('input', debounce((e) => {
                const activeFilterBtn = document.querySelector('#projectCategoryFilters button.active');
                const filter = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';
                renderProjects(filter, e.target.value);
            }, 200));
        }

        // Add Project Modal Openers
        if (elements.addProjectBtn) elements.addProjectBtn.addEventListener('click', () => openModal('addProjectModal'));
        if (elements.openAddProjectModalBtn) elements.openAddProjectModalBtn.addEventListener('click', () => openModal('addProjectModal'));

        // Add Project Form Submit
        if (elements.addProjectForm) {
            elements.addProjectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const title = document.getElementById('newProjectTitle').value;
                const category = document.getElementById('newProjectCategory').value;
                const status = document.getElementById('newProjectStatus').value;
                const tagsInput = document.getElementById('newProjectTags').value;
                const desc = document.getElementById('newProjectDesc').value;

                const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : ['JavaScript', 'HTML5'];

                const newProject = {
                    id: Date.now(),
                    title,
                    category,
                    status,
                    progress: status === 'deployed' ? 100 : (status === 'review' ? 85 : 40),
                    image: 'NenoTech.jpeg',
                    tags,
                    desc: desc || 'Custom web application crafted with high-performance responsive frontend architecture.',
                    client: 'New Client'
                };

                state.projects.unshift(newProject);
                persist('nenotech_projects', state.projects);
                renderProjects();
                closeModal('addProjectModal');
                elements.addProjectForm.reset();
                showToast('Project Added', `"${title}" has been saved to your workspace!`, 'success');
            });
        }

        // Leads Filters
        if (elements.leadsFilterAll) {
            elements.leadsFilterAll.addEventListener('click', () => {
                updateLeadFilterButtons(elements.leadsFilterAll);
                renderInquiries('all', elements.leadsSearchInput ? elements.leadsSearchInput.value : '');
            });
        }
        if (elements.leadsFilterUnread) {
            elements.leadsFilterUnread.addEventListener('click', () => {
                updateLeadFilterButtons(elements.leadsFilterUnread);
                renderInquiries('unread', elements.leadsSearchInput ? elements.leadsSearchInput.value : '');
            });
        }
        if (elements.leadsFilterReplied) {
            elements.leadsFilterReplied.addEventListener('click', () => {
                updateLeadFilterButtons(elements.leadsFilterReplied);
                renderInquiries('replied', elements.leadsSearchInput ? elements.leadsSearchInput.value : '');
            });
        }

        function updateLeadFilterButtons(activeBtn) {
            [elements.leadsFilterAll, elements.leadsFilterUnread, elements.leadsFilterReplied].forEach(btn => {
                if (btn) {
                    btn.classList.remove('dash-btn-primary', 'active');
                    btn.classList.add('dash-btn-glass');
                }
            });
            activeBtn.classList.remove('dash-btn-glass');
            activeBtn.classList.add('dash-btn-primary', 'active');
        }

        if (elements.leadsSearchInput) {
            elements.leadsSearchInput.addEventListener('input', debounce((e) => {
                renderInquiries('all', e.target.value);
            }, 200));
        }

        // Reply Form
        if (elements.replyInquiryForm) {
            elements.replyInquiryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (activeReplyInquiryId) {
                    const item = state.inquiries.find(i => i.id === activeReplyInquiryId);
                    if (item) {
                        item.status = 'replied';
                        persist('nenotech_inquiries', state.inquiries);
                        renderInquiries();
                        showToast('Reply Sent', `Message dispatched to ${item.email}`, 'success');
                    }
                }
                closeModal('replyInquiryModal');
                elements.replyInquiryForm.reset();
            });
        }

        // Export Leads CSV (formula-injection sanitized)
        if (elements.exportLeadsCsvBtn) {
            elements.exportLeadsCsvBtn.addEventListener('click', () => {
                const headers = 'ID,Name,Email,Company,Subject,Budget,Status,Received\n';
                const rows = state.inquiries.map(i =>
                    `"${csvCell(i.id)}","${csvCell(i.name)}","${csvCell(i.email)}","${csvCell(i.company)}","${csvCell(i.subject)}","${csvCell(i.budget)}","${csvCell(i.status)}","${csvCell(i.time)}"`
                ).join('\n');

                const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `NenoTech_Leads_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Export Completed', 'Client inquiries exported as CSV', 'info');
            });
        }

        // Close Modal Triggers
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.getAttribute('data-close-modal');
                if (modalId) closeModal(modalId);
            });
        });

        // Notifications Modal
        if (elements.notificationBtn) {
            elements.notificationBtn.addEventListener('click', () => openModal('notificationsModal'));
        }

        // Refresh Button
        if (elements.refreshDashboardBtn) {
            elements.refreshDashboardBtn.addEventListener('click', () => {
                elements.refreshDashboardBtn.querySelector('i').classList.add('bi-arrow-clockwise-spin');
                setTimeout(() => {
                    state.users = getStoredUsers();
                    state.testimonials = getStoredTestimonials();
                    state.projects = getStoredProjects();
                    state.inquiries = getStoredInquiries();
                    renderUsers();
                    renderProjects();
                    renderInquiries();
                    renderTestimonials();
                    renderOverviewKPIs();
                    showToast('Workspace Synced', 'All data re-loaded from local storage', 'info');
                }, 400);
            });
        }

        // Save Settings
        if (elements.saveSettingsBtn) {
            elements.saveSettingsBtn.addEventListener('click', () => {
                const settings = saveSettings();
                startAutoRefresh();
                showToast('Settings Saved', `Preferences updated for ${esc(settings.fullName)}`, 'success');
            });
        }

        // Open Add Testimonial Modal
        if (elements.openAddTestimonialModalBtn) {
            elements.openAddTestimonialModalBtn.addEventListener('click', () => openModal('addTestimonialModal'));
        }

        // Add Testimonial Form Submit
        if (elements.addTestimonialForm) {
            elements.addTestimonialForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const nameVal = document.getElementById('newReviewName').value.trim();
                const roleRaw = document.getElementById('newReviewRole').value.trim();
                const project = document.getElementById('newReviewProject').value.trim();
                const rating = parseInt(document.getElementById('newReviewRating').value, 10);
                const quote = document.getElementById('newReviewQuote').value.trim();
                const featured = document.getElementById('newReviewFeatured').checked;

                // Parse "Role, Company" from the roleRaw field
                const roleParts = roleRaw.split(',').map(s => s.trim());
                const roleStr = roleParts[0] || roleRaw;
                const companyStr = roleParts[1] || 'NenoTech Client';

                const newTestimonial = {
                    id: Date.now(),
                    clientName: nameVal,
                    role: roleStr,
                    company: companyStr,
                    project: project || 'Custom Web Project',
                    rating,
                    quote,
                    featured,
                    createdAt: new Date().toISOString().slice(0, 10)
                };

                state.testimonials.unshift(newTestimonial);
                persist('nenotech_testimonials', state.testimonials);
                renderTestimonials();
                closeModal('addTestimonialModal');
                elements.addTestimonialForm.reset();

                showToast(
                    'Review Published',
                    `${nameVal}'s endorsement has been ${featured ? 'featured live on NenoTech!' : 'saved for review.'}`,
                    'success'
                );
            });
        }

        // Testimonial Filter Buttons
        if (elements.testimonialFilterBtns && elements.testimonialFilterBtns.length) {
            elements.testimonialFilterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    elements.testimonialFilterBtns.forEach(b => {
                        b.classList.remove('dash-btn-primary', 'active');
                        b.classList.add('dash-btn-glass');
                    });
                    btn.classList.remove('dash-btn-glass');
                    btn.classList.add('dash-btn-primary', 'active');
                    const filter = btn.getAttribute('data-review-filter') || 'all';
                    const query = elements.reviewSearchInput ? elements.reviewSearchInput.value : '';
                    renderTestimonials(filter, query);
                });
            });
        }

        // Review Search Input
        if (elements.reviewSearchInput) {
            elements.reviewSearchInput.addEventListener('input', debounce((e) => {
                const activeFilterBtn = document.querySelector('#testimonialFilterBtns button.active');
                const filter = activeFilterBtn ? activeFilterBtn.getAttribute('data-review-filter') : 'all';
                renderTestimonials(filter, e.target.value);
            }, 200));
        }

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            const activeModal = document.querySelector('.dash-modal-backdrop.active');

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (elements.globalSearchInput) elements.globalSearchInput.focus();
            } else if (e.key === 'Escape') {
                if (activeModal) {
                    closeModal(activeModal.id);
                }
                document.body.classList.remove('sidebar-mobile-open');
            } else if (e.key === 'Tab' && activeModal) {
                // Simple focus trap: keep Tab/Shift+Tab inside the open modal
                const focusables = activeModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });

        // Global Search (debounced)
        if (elements.globalSearchInput) {
            elements.globalSearchInput.addEventListener('input', debounce((e) => {
                const q = e.target.value.toLowerCase().trim();
                if (!q) return;

                if (q.includes('user') || q.includes('sarah') || q.includes('james') || q.includes('admin')) {
                    switchView('users');
                    if (elements.userSearchInput) elements.userSearchInput.value = q;
                    renderUsers('all', q);
                } else if (q.includes('lead') || q.includes('inquiry')) {
                    switchView('inquiries');
                } else if (q.includes('project') || q.includes('store')) {
                    switchView('projects');
                } else if (q.includes('skill') || q.includes('tech') || q.includes('stack')) {
                    switchView('projects');
                }
            }, 200));
        }

        // Real-Time Storage Event Listener (Detects sign-in from Modern-Login portal tab)
        window.addEventListener('storage', (e) => {
            if (e.key === 'nenotech_theme' && e.newValue) {
                // The public site (or login portal) changed the shared theme.
                // Adopt it live so dashboard and site never disagree.
                const nextTheme = e.newValue === 'light' ? 'light' : 'dark';
                if (nextTheme !== state.theme) {
                    applyTheme(nextTheme);
                    showToast('Theme Synced', `Site switched to ${nextTheme === 'dark' ? 'Aurora Dark' : 'Frosted Light'} mode`, 'info');
                }
            } else if (e.key === 'nenotech_last_auth_event' && e.newValue) {
                try {
                    const eventData = JSON.parse(e.newValue);
                    handleExternalAuthEvent(eventData);
                } catch (err) {
                    console.error('Error parsing auth event:', err);
                }
            } else if (e.key === 'nenotech_users' && e.newValue) {
                try {
                    state.users = JSON.parse(e.newValue);
                    renderUsers();
                } catch (err) {
                    console.error('Error reloading users:', err);
                }
            } else if (e.key === 'nenotech_inquiries' && e.newValue) {
                try {
                    const incoming = JSON.parse(e.newValue);
                    const prepended = Array.isArray(incoming)
                        && incoming.length > 0
                        && (state.inquiries.length === 0 || incoming[0].id !== state.inquiries[0].id);
                    state.inquiries = incoming;
                    renderInquiries();
                    if (prepended) {
                        showToast('New Website Lead', 'A new inquiry just arrived from the website contact form.', 'info');
                    }
                } catch (err) {
                    console.error('Error reloading inquiries:', err);
                }
            }
        });

        }

    // --------------------------------------------------------------------------
    // 16. Greeting & Setup
    // --------------------------------------------------------------------------
    function updateGreetingDate() {
        if (!elements.currentDateGreeting) return;
        const now = new Date();
        const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
        const dateStr = now.toLocaleDateString('en-US', options);

        const hours = now.getHours();
        let timeGreeting = 'Good morning';
        if (hours >= 12 && hours < 17) timeGreeting = 'Good afternoon';
        else if (hours >= 17) timeGreeting = 'Good evening';

        elements.currentDateGreeting.textContent = `${timeGreeting}! Today is ${dateStr}. Super Admin control center is operational.`;
    }

    // --------------------------------------------------------------------------
    // 17. Settings persistence & auto-refresh
    // --------------------------------------------------------------------------
    const defaultSettings = {
        fullName: 'Husnain',
        email: 'husnain@nenotech.dev',
        brandName: 'NenoTech Studio',
        title: 'Full-Stack Web Developer & Engineer',
        theme: 'dark',
        refreshRate: 60,
        emailAlerts: true,
        soundAlerts: false
    };

    let refreshInterval = null;

    function getStoredSettings() {
        try {
            const raw = localStorage.getItem('nenotech_settings');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return Object.assign({}, defaultSettings, parsed);
                }
            }
        } catch (e) {
            console.error('Error reading nenotech_settings:', e);
        }
        return Object.assign({}, defaultSettings);
    }

    function loadSettings() {
        const settings = getStoredSettings();

        const setField = (id, value) => {
            const el = document.getElementById(id);
            if (el && value != null) el.value = value;
        };
        setField('settingFullName', settings.fullName);
        setField('settingEmail', settings.email);
        setField('settingBrandName', settings.brandName);
        setField('settingTitle', settings.title);
        setField('settingDefaultTheme', settings.theme);
        setField('settingRefreshRate', settings.refreshRate);

        const emailAlerts = document.getElementById('settingEmailAlerts');
        if (emailAlerts) emailAlerts.checked = !!settings.emailAlerts;
        const soundAlerts = document.getElementById('settingSoundAlerts');
        if (soundAlerts) soundAlerts.checked = !!settings.soundAlerts;

        // Theme is now governed by the shared site key (nenotech_theme) so the
        // dashboard, portfolio site, and login portal stay in sync. We don't
        // force the stored Settings preference here — otherwise it would stomp
        // the key the user last changed on any of the three pages.
        if (settings.theme && settings.theme !== state.theme && !localStorage.getItem('nenotech_theme')) {
            applyTheme(settings.theme);
        }
    }

    function saveSettings() {
        const val = id => (document.getElementById(id) || {}).value;
        const settings = {
            fullName: val('settingFullName') || defaultSettings.fullName,
            email: val('settingEmail') || defaultSettings.email,
            brandName: val('settingBrandName') || defaultSettings.brandName,
            title: val('settingTitle') || defaultSettings.title,
            theme: val('settingDefaultTheme') || state.theme,
            refreshRate: parseInt(val('settingRefreshRate'), 10) || 60,
            emailAlerts: !!(document.getElementById('settingEmailAlerts') || {}).checked,
            soundAlerts: !!(document.getElementById('settingSoundAlerts') || {}).checked
        };
        persist('nenotech_settings', settings);
        if (settings.theme !== state.theme) applyTheme(settings.theme);
        return settings;
    }

    function startAutoRefresh() {
        if (refreshInterval) clearInterval(refreshInterval);
        const seconds = Math.max(10, getStoredSettings().refreshRate || 60);
        refreshInterval = setInterval(() => {
            state.users = getStoredUsers();
            state.testimonials = getStoredTestimonials();
            state.projects = getStoredProjects();
            state.inquiries = getStoredInquiries();
            renderUsers();
            renderProjects();
            renderInquiries();
            renderTestimonials();
            renderOverviewKPIs();
            enforcePermissions();
        }, seconds * 1000);
    }

    // --------------------------------------------------------------------------
    // 18. Initialization
    // --------------------------------------------------------------------------
    function init() {
        loadSettings();
        updateGreetingDate();
        renderUsers();
        renderProjects();
        renderInquiries();
        renderTestimonials();
        renderOverviewKPIs();
        enforcePermissions();
        setupEventListeners();
        startAutoRefresh();

        // Honest demo-mode notice: everything lives in browser localStorage
        setTimeout(() => {
            showToast('Demo Mode', 'This dashboard stores all data locally in your browser (localStorage). Nothing is sent to a server, and "RBAC" here is cosmetic.', 'info');
        }, 900);

        // Check if there was a recent login event
        try {
            const lastEventRaw = localStorage.getItem('nenotech_last_auth_event');
            if (lastEventRaw) {
                const lastEvent = JSON.parse(lastEventRaw);
                // If within last 10 seconds, highlight it
                if (Date.now() - lastEvent.timestamp < 10000) {
                    showToast('Recent Login Detected', `${lastEvent.name || lastEvent.email} signed in to NenoTech website!`, 'info');
                }
            }
        } catch (e) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
