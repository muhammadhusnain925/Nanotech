/**
 * NenoTech Portfolio Scripts - Husnain
 * Controls Theme Toggle, Filtering, ScrollSpy, Animations & Form Handling
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Theme Toggle System ---
    const themeToggleBtn = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const htmlElement = document.documentElement;

    // Declare popupThemeToggleBtn BEFORE setTheme() so the init call can update its text correctly
    const popupThemeToggleBtn = document.getElementById('popupThemeToggle');

    // Load saved theme or default to dark
    const savedTheme = localStorage.getItem('nenotech_theme') || 'dark';
    setTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    if (popupThemeToggleBtn) {
        popupThemeToggleBtn.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('nenotech_theme', theme);

        // Update Bootstrap navbar color scheme attribute
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.setAttribute('data-bs-theme', theme);
        }

        // Update Toggle Icon
        if (themeIcon) {
            if (theme === 'light') {
                themeIcon.className = 'bi bi-moon-stars-fill';
                themeToggleBtn.setAttribute('title', 'Switch to Dark Mode');
            } else {
                themeIcon.className = 'bi bi-sun-fill text-warning';
                themeToggleBtn.setAttribute('title', 'Switch to Light Mode');
            }
        }

        if (popupThemeToggleBtn) {
            popupThemeToggleBtn.textContent = theme === 'light' ? 'Dark Mode' : 'Light Mode';
        }
    }

    // --- 2. Navbar Scroll Glass Effect & Back to Top ---
    const mainNav = document.getElementById('mainNav');
    const backToTopBtn = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        // Navbar shadow/blur on scroll
        if (scrollY > 50) {
            mainNav?.classList.add('scrolled');
        } else {
            mainNav?.classList.remove('scrolled');
        }

        // Back to top visibility
        if (scrollY > 300) {
            backToTopBtn?.classList.add('show');
        } else {
            backToTopBtn?.classList.remove('show');
        }
    });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // --- 3. Active Nav Link on Scroll (ScrollSpy) & Mobile Magic Indicator ---
    const sections = document.querySelectorAll('section[id], header[id]');
    const navLinks = document.querySelectorAll('.desktop-nav-links .nav-link[href^="#"], .navbar-nav .nav-link[href^="#"]');
    const magicNavItems = document.querySelectorAll('.magic-nav-item');
    const magicIndicator = document.getElementById('magicIndicator');
    const mobileMagicNav = document.getElementById('mobileMagicNav');
    const magicPopup = document.getElementById('mobileMagicPopup');
    const magicPopupBackdrop = document.getElementById('magicPopupBackdrop');
    const closeMagicPopupBtn = document.getElementById('closeMagicPopup');
    const magicSettingsTrigger = document.getElementById('magicSettingsTrigger');
    const popupNavLinks = document.querySelectorAll('.popup-nav-link');

    let currentActiveSectionId = 'home';
    let isPopupOpen = false;

    // --- Scroll Spy Lock: prevents scroll events from overriding a click-selected indicator ---
    let isManualNavClick = false;
    let scrollLockTimeout = null;

    function lockScrollSpy() {
        isManualNavClick = true;
        clearTimeout(scrollLockTimeout);

        // Modern browsers: release lock exactly when smooth scroll finishes
        const onScrollEnd = () => {
            isManualNavClick = false;
            clearTimeout(scrollLockTimeout);
        };
        window.addEventListener('scrollend', onScrollEnd, { once: true });

        // Fallback for older browsers: release after 1.1s (smooth scroll ceiling)
        scrollLockTimeout = setTimeout(() => {
            isManualNavClick = false;
            window.removeEventListener('scrollend', onScrollEnd);
        }, 1100);
    }

    let cutoutAnimId = null;
    function syncIndicatorCutout() {
        if (!magicIndicator || !mobileMagicNav) return;
        const navRect = mobileMagicNav.getBoundingClientRect();
        const indRect = magicIndicator.getBoundingClientRect();
        const centerX = (indRect.left - navRect.left) + (indRect.width / 2);
        mobileMagicNav.style.setProperty('--indicator-center-x', `${centerX}px`);
    }

    function animateIndicatorCutout() {
        if (cutoutAnimId) cancelAnimationFrame(cutoutAnimId);
        const startTime = performance.now();
        const duration = 500;
        function step(now) {
            syncIndicatorCutout();
            if (now - startTime < duration) {
                cutoutAnimId = requestAnimationFrame(step);
            } else {
                syncIndicatorCutout();
                cutoutAnimId = null;
            }
        }
        cutoutAnimId = requestAnimationFrame(step);
    }

    function setMagicIndicator(activeItem) {
        if (!activeItem || !magicIndicator) return;

        magicNavItems.forEach(item => item.classList.remove('active'));
        activeItem.classList.add('active');

        // Use getBoundingClientRect() for pixel-perfect position in flex layouts
        // (offsetLeft can be inaccurate with nested positioned/flex containers)
        const navList = document.getElementById('magicNavList');
        if (navList) {
            const navListRect = navList.getBoundingClientRect();
            const itemRect = activeItem.getBoundingClientRect();
            const targetLeft = (itemRect.left - navListRect.left) + (itemRect.width / 2) - (magicIndicator.offsetWidth / 2);
            magicIndicator.style.left = `${targetLeft}px`;
        } else {
            // Graceful fallback
            const targetLeft = activeItem.offsetLeft + (activeItem.offsetWidth / 2) - (magicIndicator.offsetWidth / 2);
            magicIndicator.style.left = `${targetLeft}px`;
        }
        animateIndicatorCutout();
    }

    function openMagicPopup() {
        if (!magicPopup || !magicPopupBackdrop) return;
        isPopupOpen = true;
        magicPopup.classList.add('show');
        magicPopupBackdrop.classList.add('show');
        if (magicSettingsTrigger) {
            setMagicIndicator(magicSettingsTrigger);
            // Gear spin animation + accessibility
            magicSettingsTrigger.classList.add('popup-open');
            const settingsBtn = document.getElementById('magicSettingsBtn');
            if (settingsBtn) {
                settingsBtn.setAttribute('aria-expanded', 'true');
                settingsBtn.setAttribute('aria-label', 'Close Quick Menu');
            }
        }
    }

    function closeMagicPopup() {
        if (!magicPopup || !magicPopupBackdrop) return;
        isPopupOpen = false;
        magicPopup.classList.remove('show');
        magicPopupBackdrop.classList.remove('show');
        if (magicSettingsTrigger) {
            // Restore gear icon + accessibility
            magicSettingsTrigger.classList.remove('popup-open');
            const settingsBtn = document.getElementById('magicSettingsBtn');
            if (settingsBtn) {
                settingsBtn.setAttribute('aria-expanded', 'false');
                settingsBtn.setAttribute('aria-label', 'Open Quick Menu');
            }
        }
        // Restore active item to current visible section
        syncMagicIndicatorWithSection(currentActiveSectionId);
    }

    function syncMagicIndicatorWithSection(sectionId) {
        // Block scroll-spy overrides while user's click scroll is still animating
        if (isPopupOpen || isManualNavClick) return;
        let targetSelector = `#${sectionId}`;
        if (sectionId === 'testimonials' || sectionId === 'contact') {
            targetSelector = '#projects';
        }

        const matchedItem = document.querySelector(`.magic-nav-item[data-target="${targetSelector}"]`);
        if (matchedItem) {
            setMagicIndicator(matchedItem);
        }
    }

    function updateActiveNav() {
        let currentSectionId = '';
        const scrollPosition = window.scrollY + 140;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        if (currentSectionId) {
            currentActiveSectionId = currentSectionId;

            // Update desktop nav links
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentSectionId}`) {
                    link.classList.add('active');
                }
            });

            // Update mobile magic nav if popup is closed
            syncMagicIndicatorWithSection(currentSectionId);
        }
    }

    window.addEventListener('scroll', updateActiveNav);
    window.addEventListener('resize', () => {
        const currentActiveItem = document.querySelector('.magic-nav-item.active');
        if (currentActiveItem) {
            setMagicIndicator(currentActiveItem);
        }
    });

    // Magic bottom nav item click handlers
    magicNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.id === 'magicSettingsTrigger') {
                e.preventDefault();
                if (isPopupOpen) {
                    closeMagicPopup();
                } else {
                    openMagicPopup();
                }
            } else {
                closeMagicPopup();
                const targetId = item.getAttribute('data-target');
                if (targetId) {
                    const targetEl = document.querySelector(targetId);
                    if (targetEl) {
                        e.preventDefault();
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                    }
                }
                // Set indicator THEN lock — scroll spy cannot override until scroll finishes
                setMagicIndicator(item);
                lockScrollSpy();
            }
        });
    });

    // Close popup on backdrop click or close button
    if (closeMagicPopupBtn) closeMagicPopupBtn.addEventListener('click', closeMagicPopup);
    if (magicPopupBackdrop) magicPopupBackdrop.addEventListener('click', closeMagicPopup);

    // Close popup on internal link click
    popupNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            closeMagicPopup();
            if (href && href.startsWith('#')) {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth' });
                    let targetSelector = href;
                    if (href === '#testimonials' || href === '#contact') {
                        targetSelector = '#projects';
                    }
                    const matchedItem = document.querySelector(`.magic-nav-item[data-target="${targetSelector}"]`);
                    if (matchedItem) {
                        // Lock scroll spy so the indicator stays on the chosen item
                        setMagicIndicator(matchedItem);
                        lockScrollSpy();
                    }
                }
            }
        });
    });

    // Initial positioning on load — use requestAnimationFrame after full load for reliable first paint
    const initMagicNav = () => {
        updateActiveNav();
        const initialActive = document.querySelector('.magic-nav-item.active') || magicNavItems[0];
        if (initialActive) {
            setMagicIndicator(initialActive);
        }
    };
    // Run once immediately for early positioning
    initMagicNav();
    // Re-run after all assets (fonts, images) load so offsetWidth/Left are stable — no setTimeout hack
    window.addEventListener('load', () => requestAnimationFrame(initMagicNav));

    // --- 4. Interactive Project Filtering ---
    const filterButtons = document.querySelectorAll('.project-filter-btn');
    const projectItems = document.querySelectorAll('.project-item');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            projectItems.forEach(item => {
                const category = item.getAttribute('data-category');
                if (filterValue === 'all' || category === filterValue) {
                    item.style.display = 'block';
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'scale(1)';
                    }, 50);
                } else {
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.92)';
                    setTimeout(() => {
                        item.style.display = 'none';
                    }, 250);
                }
            });
        });
    });

    // --- 5. Project Modal Details Dynamic Filler ---
    const projectModal = document.getElementById('projectDetailModal');
    if (projectModal) {
        projectModal.addEventListener('show.bs.modal', (event) => {
            const button = event.relatedTarget;
            if (!button) return;

            const title = button.getAttribute('data-title') || 'Project Preview';
            const desc = button.getAttribute('data-desc') || 'Project details and tech stack showcase.';
            const image = button.getAttribute('data-img') || 'NenoTech.jpeg';
            const tags = button.getAttribute('data-tags') || 'HTML, CSS, JavaScript';
            const liveUrl = button.getAttribute('data-url') || '#';

            document.getElementById('modalProjectTitle').textContent = title;
            document.getElementById('modalProjectDesc').textContent = desc;
            document.getElementById('modalProjectImg').setAttribute('src', image);
            document.getElementById('modalProjectLiveBtn').setAttribute('href', liveUrl);

            // Populate tags
            const tagsContainer = document.getElementById('modalProjectTags');
            tagsContainer.innerHTML = '';
            tags.split(',').forEach(tag => {
                const span = document.createElement('span');
                span.className = 'tech-tag';
                span.textContent = tag.trim();
                tagsContainer.appendChild(span);
            });
        });
    }

    // --- 6. Contact Form Interactive Submission ---
    // Persists a submitted inquiry to the NenoTech dashboard Leads store and
    // notifies any open dashboard tab via the shared storage key. Mirrors the
    // exact object shape dashboard.js renders (nenotech_inquiries).
    function persistInquiry(name, email, subject, message) {
        try {
            let list = [];
            try {
                const raw = localStorage.getItem('nenotech_inquiries');
                list = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(list)) list = [];
            } catch (e) { list = []; }

            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const timeStamp = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

            list.unshift({
                id: Date.now(),
                name: name || 'Website Visitor',
                email: email || '',
                company: '',
                subject: subject || 'New Website Inquiry',
                message: message || '',
                budget: '',
                status: 'unread',
                time: `Just now · ${timeStamp}`
            });

            localStorage.setItem('nenotech_inquiries', JSON.stringify(list));

            // Fire a storage event so an already-open dashboard re-renders Leads immediately
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'nenotech_inquiries',
                oldValue: null,
                newValue: JSON.stringify(list)
            }));
        } catch (err) {
            console.error('Could not persist inquiry to nenotech_inquiries:', err);
        }
    }

    const contactForm = document.getElementById('contactForm');
    const formAlert = document.getElementById('contactFormAlert');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            // Show loading spinner
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Sending...`;

            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;

                // Show success feedback message
                if (formAlert) {
                    // Persist to the dashboard Leads store so the submission
                    // appears in the NenoTech admin panel in real time.
                    persistInquiry(
                        (document.getElementById('contactName') || {}).value,
                        (document.getElementById('contactEmail') || {}).value,
                        (document.getElementById('contactSubject') || {}).value,
                        (document.getElementById('contactMessage') || {}).value
                    );

                    formAlert.className = 'alert alert-success d-flex align-items-center mb-4';
                    formAlert.innerHTML = `
                        <i class="bi bi-check-circle-fill fs-4 me-2"></i>
                        <div>
                            <strong>Thank you!</strong> Your message has been sent successfully. Husnain will get back to you shortly!
                        </div>
                    `;
                    formAlert.classList.remove('d-none');

                    // Reset form
                    contactForm.reset();

                    // Hide alert after 6 seconds
                    setTimeout(() => {
                        formAlert.classList.add('d-none');
                    }, 6000);
                }
            }, 1000);
        });
    }

    // --- 7. Hero Dynamic Typewriter Effect ---
    const typewriterElement = document.getElementById('heroTypewriter');
    if (typewriterElement) {
        const roles = [
            "Full-Stack Web Developer",
            "Modern UI/UX Craftsman",
            "Performance & Clean Code Specialist",
            "Interactive Web Applications Creator"
        ];
        let roleIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typingSpeed = 80;

        function typeLoop() {
            const currentRole = roles[roleIndex];
            if (isDeleting) {
                typewriterElement.textContent = currentRole.substring(0, charIndex - 1);
                charIndex--;
                typingSpeed = 40;
            } else {
                typewriterElement.textContent = currentRole.substring(0, charIndex + 1);
                charIndex++;
                typingSpeed = 80;
            }

            if (!isDeleting && charIndex === currentRole.length) {
                typingSpeed = 2200; // Pause at completion
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                roleIndex = (roleIndex + 1) % roles.length;
                typingSpeed = 400; // Pause before typing next
            }

            setTimeout(typeLoop, typingSpeed);
        }

        typeLoop();
    }

    // --- 8. 3D Tilt and Specular Glare Effect for Cards ---
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const tiltCards = document.querySelectorAll('.project-card, .skill-card, .skill-bento-card');

        tiltCards.forEach(card => {
            // Append glare element if not present
            let glare = card.querySelector('.tilt-glare');
            if (!glare) {
                glare = document.createElement('div');
                glare.className = 'tilt-glare';
                card.appendChild(glare);
            }

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -9; // gentle 9 deg tilt
                const rotateY = ((x - centerX) / centerX) * 9;

                card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

                // Update glare position
                const glareXPercent = (x / rect.width) * 100;
                const glareYPercent = (y / rect.height) * 100;
                card.style.setProperty('--glare-x', `${glareXPercent}%`);
                card.style.setProperty('--glare-y', `${glareYPercent}%`);
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            });
        });
    }

    // --- 9. Magnetic Elastic Attraction for CTA & Social Buttons ---
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const magneticBtns = document.querySelectorAll('.magnetic-btn, .social-icon-btn');

        magneticBtns.forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                // Move button slightly toward cursor
                btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;

                // Parallax shift for inner icon if present
                const innerIcon = btn.querySelector('i');
                if (innerIcon) {
                    innerIcon.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
                }
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translate(0px, 0px)';
                const innerIcon = btn.querySelector('i');
                if (innerIcon) {
                    innerIcon.style.transform = 'translate(0px, 0px)';
                }
            });
        });
    }

    // --- 10. Skills Auto-Slider Controller ---
    const skillsRow = document.getElementById('skillsCardsRow');
    const skillPills = document.querySelectorAll('.skill-tab-pill');
    const skillDots = document.querySelectorAll('.skill-dot');
    const prevBtn = document.getElementById('skillSliderPrev');
    const nextBtn = document.getElementById('skillSliderNext');

    if (skillsRow && skillPills.length > 0) {
        const skillCards = skillsRow.querySelectorAll('.skill-col-item, :scope > [class*="col-"]');
        const totalCards = skillCards.length;
        let activeIndex = 0;
        let autoSlideTimer = null;
        let isHovered = false;

        function updateIndicators(index) {
            activeIndex = index;
            skillPills.forEach((p, i) => p.classList.toggle('active', i === index));
            skillDots.forEach((d, i) => d.classList.toggle('active', i === index));
        }

        function scrollToCard(index, smooth = true) {
            if (index < 0) index = totalCards - 1;
            if (index >= totalCards) index = 0;

            const targetCard = skillCards[index];
            if (targetCard) {
                const vw = window.innerWidth;
                const isTwoCardView = vw >= 768 && vw < 1200;

                // Calculate horizontal offset relative to the scrollable row —
                // avoids scrollIntoView which also scrolls the PAGE vertically.
                const rowRect = skillsRow.getBoundingClientRect();
                const cardRect = targetCard.getBoundingClientRect();

                let targetScrollLeft;
                if (isTwoCardView) {
                    // Start-snap: align card's left edge with row's left edge
                    targetScrollLeft = skillsRow.scrollLeft + (cardRect.left - rowRect.left);
                } else {
                    // Center-snap: center the card within the row
                    const rowCenter = rowRect.left + rowRect.width / 2;
                    const cardCenter = cardRect.left + cardRect.width / 2;
                    targetScrollLeft = skillsRow.scrollLeft + (cardCenter - rowCenter);
                }

                skillsRow.scrollTo({
                    left: targetScrollLeft,
                    behavior: smooth ? 'smooth' : 'auto'
                });

                updateIndicators(index);
            }
        }

        function nextSlide() {
            scrollToCard((activeIndex + 1) % totalCards);
        }

        function prevSlide() {
            scrollToCard((activeIndex - 1 + totalCards) % totalCards);
        }

        // Auto-slide loop (slides every 3.5s)
        function startAutoSlider() {
            stopAutoSlider();
            autoSlideTimer = setInterval(() => {
                // Only slide if carousel has scrollable overflow or on mobile/tablet
                const isScrollable = skillsRow.scrollWidth > (skillsRow.clientWidth + 15);
                if (!isHovered && isScrollable) {
                    nextSlide();
                }
            }, 3500);
        }

        function stopAutoSlider() {
            if (autoSlideTimer) {
                clearInterval(autoSlideTimer);
                autoSlideTimer = null;
            }
        }

        // Arrow Controls
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                nextSlide();
                startAutoSlider();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                prevSlide();
                startAutoSlider();
            });
        }

        // Click pill to scroll to card
        skillPills.forEach(pill => {
            pill.addEventListener('click', () => {
                const idx = parseInt(pill.getAttribute('data-index'), 10);
                scrollToCard(idx);
                startAutoSlider();
            });
        });

        // Click dot to scroll to card
        skillDots.forEach(dot => {
            dot.addEventListener('click', () => {
                const idx = parseInt(dot.getAttribute('data-index'), 10);
                scrollToCard(idx);
                startAutoSlider();
            });
        });

        // Pause on mouse hover (so user can comfortably read skills)
        skillsRow.addEventListener('mouseenter', () => isHovered = true);
        skillsRow.addEventListener('mouseleave', () => isHovered = false);

        // Pause on touch interaction
        skillsRow.addEventListener('touchstart', () => isHovered = true, { passive: true });
        skillsRow.addEventListener('touchend', () => {
            setTimeout(() => isHovered = false, 3500);
        }, { passive: true });

        // Update active indicators when user swipes manually
        let scrollTimeout;
        skillsRow.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollLeft = skillsRow.scrollLeft;
                let closestIndex = 0;
                let minDiff = Infinity;
                skillCards.forEach((card, i) => {
                    const diff = Math.abs(card.offsetLeft - skillsRow.offsetLeft - scrollLeft);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestIndex = i;
                    }
                });
                updateIndicators(closestIndex);
            }, 60);
        }, { passive: true });

        // Start auto slider
        startAutoSlider();
    }
});