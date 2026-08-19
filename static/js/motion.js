/**
 * motion.js — Atharva Bhosale Portfolio
 * ────────────────────────────────────────────────────────────────
 * Complete motion engine. ONE system. Every animation lives here.
 *
 * Architecture:
 *   1. Motion Tokens (JS mirror of CSS tokens)
 *   2. Lenis smooth scroll initialisation
 *   3. Cinematic Page Loader
 *   4. Custom Cursor (two-layer lerp)
 *   5. Navigation (scroll hide/reveal + overlay stagger)
 *   6. GSAP Orchestration:
 *      a. Hero assembly
 *      b. Philosophy word scrub
 *      c. Section reveals (unified)
 *      d. Horizontal project scroll pin
 *      e. Journey SVG draw
 *      f. Parallax layers (desktop)
 *   7. Project Card 3D Tilt
 *   8. Magnetic Buttons
 *   9. Scroll indicator
 * ────────────────────────────────────────────────────────────────
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   1. MOTION TOKENS (mirrors motion.css)
   ══════════════════════════════════════════════════════════════ */
const M = {
  dur: {
    instant: 0.06,
    fast:    0.18,
    normal:  0.42,
    slow:    0.85,
    epic:    1.60,
  },
  ease: {
    out:    'cubic-bezier(0.16, 1, 0.3, 1)',
    in:     'cubic-bezier(0.7, 0, 0.84, 0)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  gsap: {
    out:    'power3.out',
    in:     'power3.in',
    spring: 'back.out(1.4)',
    expo:   'expo.out',
    smooth: 'power2.inOut',
    none:   'none',
  },
  stagger: 0.08,
};


/* ══════════════════════════════════════════════════════════════
   2. LENIS SMOOTH SCROLL
   ══════════════════════════════════════════════════════════════ */
const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 2,
});

// Expose lenis globally for app.js (modals need lenis.stop/start)
window._lenis = lenis;

// GSAP integration — ticker drives Lenis exclusively (no dual RAF)
if (typeof gsap !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.on('scroll', ScrollTrigger.update);
}


/* ══════════════════════════════════════════════════════════════
   3. CINEMATIC PAGE LOADER
   ══════════════════════════════════════════════════════════════ */
(function initLoader() {
  const loader     = document.getElementById('page-loader');
  const loaderLogo = loader?.querySelector('.loader-logo');
  const loaderBar  = document.getElementById('loaderBar');
  const loaderCount = document.getElementById('loaderCount');
  const loaderTag  = loader?.querySelector('.loader-tagline');

  if (!loader) {
    document.body.classList.remove('loading');
    document.body.classList.add('loaded');
    return;
  }

  // Optimize: Run loader only once per session
  if (sessionStorage.getItem('loaderSeen')) {
    loader.style.display = 'none';
    document.body.classList.remove('loading');
    document.body.classList.add('loaded');
    runHeroSequence();
    return;
  }
  sessionStorage.setItem('loaderSeen', 'true');

  // Prevent scroll during load
  lenis.stop();

  // Sequence timings (ms)
  const T = {
    logoIn:    120,   // logo starts appearing
    barStart:  500,   // bar starts sweeping
    tagIn:     600,   // tagline appears
    countIn:   300,   // counter appears
    exit:      800,   // loader starts leaving (reduced from 1350 for faster LCP)
    complete:  1100,  // loader fully gone, scroll unlocked (reduced from 1700)
  };

  // Logo in
  setTimeout(() => {
    loaderLogo?.classList.add('visible');
    loaderTag?.classList.add('visible');
    loaderCount?.classList.add('visible');
  }, T.logoIn);

  // Animated counter 0→100
  let countStart = null;
  const countDuration = 900;
  function animateCount(timestamp) {
    if (!countStart) countStart = timestamp;
    const elapsed = timestamp - countStart;
    const progress = Math.min(elapsed / countDuration, 1);
    // Eased progress
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(eased * 100);
    if (loaderCount) loaderCount.textContent = value < 100 ? `${value}` : '100';
    if (progress < 1) requestAnimationFrame(animateCount);
  }
  setTimeout(() => requestAnimationFrame(animateCount), T.barStart - 100);

  // Bar sweep
  setTimeout(() => {
    if (loaderBar) loaderBar.classList.add('animate');
  }, T.barStart);

  // Exit
  setTimeout(() => {
    loader.classList.add('loader-exit');
    document.body.classList.remove('loading');
  }, T.exit);

  // Complete — unlock scroll, run hero sequence
  setTimeout(() => {
    loader.style.display = 'none';
    document.body.classList.add('loaded');
    lenis.start();
    runHeroSequence();
  }, T.complete);
})();


/* ══════════════════════════════════════════════════════════════
   4. CUSTOM CURSOR — Two-layer lerp system
   ══════════════════════════════════════════════════════════════ */
(function initCursor() {
  // Skip on touch devices
  if (window.matchMedia('(hover: none)').matches) return;

  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  // Current cursor world position
  let mouseX = window.innerWidth  / 2;
  let mouseY = window.innerHeight / 2;

  // Ring lerped position
  let ringX  = mouseX;
  let ringY  = mouseY;

  // Track mouse (desktop only to save event overhead)
  if (window.matchMedia('(min-width: 768px)').matches) {
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
  }

  // RAF lerp loop — cursor NEVER uses GSAP (lighter, more responsive)
  const LERP = 0.10; // ring lag amount
  let rafId = null;

  function tickCursor() {
    // Dot: instant
    dot.style.transform = `translate(${mouseX - 4}px, ${mouseY - 4}px)`;

    // Ring: lerp toward mouse
    ringX += (mouseX - ringX) * LERP;
    ringY += (mouseY - ringY) * LERP;
    const rw = ring.offsetWidth;
    const rh = ring.offsetHeight;
    ring.style.transform = `translate(${ringX - rw / 2}px, ${ringY - rh / 2}px)`;

    rafId = requestAnimationFrame(tickCursor);
  }
  
  if (window.matchMedia('(min-width: 768px)').matches) {
    requestAnimationFrame(tickCursor);
  }

  // ── Cursor State Handlers ──────────────────────────────────
  const states = {
    hover:   ['cursor-hover',   ['a', 'button', '.btn-premium', '.btn-outline', '[role="button"]']],
    project: ['cursor-project', ['.work-image-wrap']],
    image:   ['cursor-image',   ['.proof-card', '.proof-img-wrap', '.ach-modal-photo']],
    text:    ['cursor-text',    ['input', 'textarea']],
  };

  function clearCursorStates() {
    Object.values(states).forEach(([cls]) => document.body.classList.remove(cls));
  }

  Object.entries(states).forEach(([, [cls, selectors]]) => {
    const selector = selectors.join(', ');

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(selector)) {
        clearCursorStates();
        document.body.classList.add(cls);
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(selector)) {
        document.body.classList.remove(cls);
      }
    });
  });

  // Click state (brief ring contract)
  document.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
  document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-click'));

  // Hide when leaving window
  document.addEventListener('mouseleave', () => {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity  = '1';
    ring.style.opacity = '1';
  });
})();


/* ══════════════════════════════════════════════════════════════
   5. NAVIGATION (Premium Overlay)
   ══════════════════════════════════════════════════════════════ */
(function initNav() {
  const header     = document.getElementById('global-header');
  const menuToggle = document.getElementById('menuToggle');
  const navOverlay = document.querySelector('.nav-overlay');
  const navLeft    = document.querySelector('.nav-left');
  const navLinks   = document.querySelectorAll('.nav-link');
  const navItems   = document.querySelectorAll('.nav-links li');
  const firstLink  = navLinks[0];

  if (!menuToggle || !navOverlay) return;

  // ── Scroll Hide/Reveal Header ──────────────────────────────
  let lastScrollY = 0;
  let ticking = false;
  const HIDE_THRESHOLD = 80;

  lenis.on('scroll', ({ scroll }) => {
    // Only hide if menu is NOT active
    if (!ticking && !menuToggle.classList.contains('active')) {
      requestAnimationFrame(() => {
        const delta = scroll - lastScrollY;
        if (delta > 0 && scroll > HIDE_THRESHOLD) {
          header?.classList.add('nav-hidden');
        } else if (delta < 0) {
          header?.classList.remove('nav-hidden');
        }
        lastScrollY = scroll;
        ticking = false;
      });
      ticking = true;
    }
  });

  // ── GSAP Timeline Setup ────────────────────────────────────
  gsap.set(navOverlay, { autoAlpha: 0 }); // Handles visibility and opacity
  gsap.set(navLinks, { y: '100%', skewY: 5 });
  gsap.set(navLeft, { y: 20, opacity: 0 });

  const tl = gsap.timeline({ paused: true, defaults: { ease: M.gsap.expo } });

  tl.to(navOverlay, { autoAlpha: 1, duration: 0.6 })
    .to(navLinks, {
      y: '0%', 
      skewY: 0, 
      duration: 0.8, 
      stagger: 0.1,
      ease: 'power4.out'
    }, "-=0.3")
    .to(navLeft, {
      y: 0, 
      opacity: 1, 
      duration: 0.6, 
      ease: 'power3.out'
    }, "-=0.5");

  function openMenu() {
    menuToggle.classList.add('active');
    navOverlay.classList.add('active');
    header?.classList.add('menu-active'); // Elevate z-index
    header?.classList.remove('nav-hidden');
    
    // Lock scrolling completely
    lenis.stop();
    document.body.style.overflow = 'hidden';

    tl.timeScale(1).play();
    
    // Focus management for accessibility
    setTimeout(() => { if (firstLink) firstLink.focus(); }, 100);
  }

  function closeMenu() {
    menuToggle.classList.remove('active');
    
    // Unlock scrolling immediately so lenis.scrollTo works
    document.body.style.overflow = '';
    if (typeof lenis !== 'undefined') lenis.start();

    // Reverse animation fast
    tl.timeScale(1.8).reverse().then(() => {
      navOverlay.classList.remove('active');
      header?.classList.remove('menu-active');
    });
  }

  // Toggle button
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.contains('active') ? closeMenu() : openMenu();
  });

  // Link click -> close menu then scroll
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      const target = document.querySelector(href);
      
      closeMenu();
      
      if (target) {
        // Scroll immediately while menu closes
        if (typeof lenis !== 'undefined') {
          lenis.scrollTo(target, { offset: -100, duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        } else {
          const y = target.getBoundingClientRect().top + window.pageYOffset - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
    });
  });

  // Keyboard accessibility
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuToggle.classList.contains('active')) {
      closeMenu();
    }
  });

})();


/* ══════════════════════════════════════════════════════════════
   6. GSAP ORCHESTRATION
   ══════════════════════════════════════════════════════════════ */

/* 6a. Hero Cinematic Assembly — runs after loader exits */
function runHeroSequence() {
  if (typeof gsap === 'undefined') return;

  const tl = gsap.timeline({
    defaults: { ease: M.gsap.expo, force3D: true },
  });

  // Nav slides in
  tl.fromTo('#global-header',
    { y: -28, opacity: 0 },
    { y: 0, opacity: 1, duration: M.dur.slow },
    0
  );

  // Neural canvas fades in
  tl.to('#neuralCanvas',
    { opacity: 1, duration: M.dur.epic, ease: M.gsap.smooth },
    0
  );

  // Grid overlay fades in
  tl.to('.hero-grid-overlay',
    { opacity: 1, duration: M.dur.epic * 1.2, ease: M.gsap.smooth },
    0.1
  );

  // Ambient glow breathes in
  tl.to('.hero-ambient-glow',
    { opacity: 1, duration: M.dur.epic * 1.5, ease: M.gsap.smooth },
    0.2
  );

  // Cinematic background fades in gracefully
  tl.to('#heroCinematicBg',
    { opacity: 1, duration: M.dur.epic * 1.5, ease: 'power2.out' },
    0.2
  );

  // Status tag slides in from left
  tl.fromTo('#heroRoleBadge',
    { x: -24, opacity: 0 },
    { x: 0, opacity: 1, duration: M.dur.normal },
    0.1
  );

  // "SYSTEMS" reveals up from clip
  tl.fromTo('#titleWord1',
    { y: '105%' },
    { y: '0%', duration: M.dur.epic, ease: 'power4.out' },
    0.2
  );

  // "THAT" reveals up
  tl.fromTo('#titleWord2',
    { y: '105%' },
    { y: '0%', duration: M.dur.epic, ease: 'power4.out' },
    0.42
  );

  // "THINK." reveals up with slight spring overshoot
  tl.fromTo('#titleWord3',
    { y: '105%' },
    { y: '0%', duration: M.dur.epic, ease: 'back.out(1.2)' },
    0.64
  );

  // CTAs scale up
  tl.fromTo('#heroCtas',
    { scale: 0.88, opacity: 0 },
    { scale: 1, opacity: 1, duration: M.dur.slow, ease: M.gsap.spring },
    1.4
  );

  // Scroll cue fades in last
  tl.to('#heroScrollCue',
    { opacity: 1, duration: M.dur.slow },
    1.7
  );

  // Fade out scroll cue on scroll
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.to('#heroScrollCue', {
      opacity: 0,
      y: -15,
      ease: 'power2.in',
      scrollTrigger: {
        trigger: '.hero-sequence',
        start: 'top top',
        end: '+=150',
        scrub: true,
      }
    });
  }

  // After hero reveals, launch neural canvas + parallax
  tl.call(() => {
    initNeuralCanvas();
    initHeroParallax();
  }, [], 0.3);
}


/* ── Neural Network Canvas ─────────────────────────────────────
   Pure Canvas 2D — ~80 nodes with bezier connections.
   Nodes drift autonomously; react to mouse within 200px radius.
   Throttled to ~30fps to stay under 1ms/frame.
   ─────────────────────────────────────────────────────────── */
function initNeuralCanvas() {
  // Skip if reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('neuralCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H;

  // Mouse world coordinates (viewport)
  let mx = -9999, my = -9999;
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
  });

  // Resize handler
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Node count — fewer on mobile for performance
  const NODE_COUNT = window.innerWidth < 768 ? 45 : 80;
  const CONNECT_DIST  = 160;  // px: max distance to draw a connection line
  const MOUSE_RADIUS  = 200;  // px: mouse influence radius
  const MOUSE_FORCE   = 0.018; // strength of mouse pull on nodes
  const MIN_OPACITY   = 0.06;
  const MAX_OPACITY   = 0.22;

  // Generate nodes
  const nodes = Array.from({ length: NODE_COUNT }, () => ({
    x:  Math.random() * window.innerWidth,
    y:  Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    r:  1 + Math.random() * 1.4,
    opacity: MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY),
  }));

  // Throttle RAF to 30fps
  let lastFrame = 0;
  const FRAME_INTERVAL = 1000 / 30;
  let rafId = null;
  let running = true;

  function draw(timestamp) {
    if (!running) return;
    rafId = requestAnimationFrame(draw);

    if (timestamp - lastFrame < FRAME_INTERVAL) return;
    lastFrame = timestamp;

    ctx.clearRect(0, 0, W, H);

    // Update and draw nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      // Mouse attraction
      const distMx = mx - n.x;
      const distMy = my - n.y;
      const distM  = Math.sqrt(distMx * distMx + distMy * distMy);
      if (distM < MOUSE_RADIUS) {
        const force = (1 - distM / MOUSE_RADIUS) * MOUSE_FORCE;
        n.vx += distMx * force;
        n.vy += distMy * force;
      }

      // Velocity damping (prevents runaway)
      n.vx *= 0.98;
      n.vy *= 0.98;

      // Position update
      n.x += n.vx;
      n.y += n.vy;

      // Wrap edges
      if (n.x < 0)  n.x = W;
      if (n.x > W)  n.x = 0;
      if (n.y < 0)  n.y = H;
      if (n.y > H)  n.y = 0;

      // Draw node dot
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${n.opacity})`;
      ctx.fill();

      // Draw connections to nearby nodes
      for (let j = i + 1; j < nodes.length; j++) {
        const m  = nodes[j];
        const dx = m.x - n.x;
        const dy = m.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.18;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          // Subtle bezier curve instead of straight line
          const cx1 = n.x + dx * 0.35 + dy * 0.08;
          const cy1 = n.y + dy * 0.35 - dx * 0.08;
          ctx.quadraticCurveTo(cx1, cy1, m.x, m.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  requestAnimationFrame(draw);

  // Pause canvas when hero leaves viewport (performance)
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.create({
      trigger: '.hero-sequence',
      start: 'top top',
      end: '100% top',
      onLeave: () => {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        document.body.classList.add('hero-canvas-hidden');
      },
      onEnterBack: () => {
        running = true;
        document.body.classList.remove('hero-canvas-hidden');
        requestAnimationFrame(draw);
      },
    });
  }
}


/* ── Hero Multi-Layer Parallax ─────────────────────────────────
   Desktop only. Three depth layers react to mouse position.
   Uses LERP for smooth, non-janky follow.
   ─────────────────────────────────────────────────────────── */
function initHeroParallax() {
  if (window.matchMedia('(hover: none), (prefers-reduced-motion: reduce), (max-width: 768px)').matches) return;

  const tag      = document.getElementById('heroRoleBadge');
  const headline = document.getElementById('heroHeadlineBlock');
  const canvas   = document.getElementById('neuralCanvas');
  const mDistant = document.getElementById('cinemaDistant');
  const mMiddle  = document.getElementById('cinemaMiddle');
  const mFore    = document.getElementById('cinemaForeground');
  const moon     = document.getElementById('cinemaMoon');

  let mx = 0, my = 0;
  let cx = 0, cy = 0; // lerped values per layer
  let hx = 0, hy = 0;
  let nx = 0, ny = 0;
  let mdx = 0, mdy = 0;
  let mmx = 0, mmy = 0;
  let mfx = 0, mfy = 0;
  let mox = 0, moy = 0;

  const centerX = window.innerWidth  / 2;
  const centerY = window.innerHeight / 2;

  document.addEventListener('mousemove', (e) => {
    // Normalize to -1 → 1 relative to viewport center
    mx = (e.clientX - centerX) / centerX;
    my = (e.clientY - centerY) / centerY;
  });

  // Only run parallax while hero is in viewport
  let active = true;
  let rafParallax = null;

  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.create({
      trigger: '.hero-sequence',
      start: 'top top',
      end: '80% top',
      onLeave: ()      => { active = false; },
      onEnterBack: ()  => { active = true; rafParallax = requestAnimationFrame(tick); },
    });

    // Scroll Parallax for cinematic layers (using yPercent so it stacks safely with GSAP's y/x)
    gsap.to('#cinemaDistant', { yPercent: 5, ease: 'none', scrollTrigger: { trigger: '.hero-sequence', start: 'top top', end: 'bottom top', scrub: true }});
    gsap.to('#cinemaMiddle', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero-sequence', start: 'top top', end: 'bottom top', scrub: true }});
    gsap.to('#cinemaForeground', { yPercent: 20, ease: 'none', scrollTrigger: { trigger: '.hero-sequence', start: 'top top', end: 'bottom top', scrub: true }});
    gsap.to('#cinemaMoon', { yPercent: 15, ease: 'none', scrollTrigger: { trigger: '.hero-sequence', start: 'top top', end: 'bottom top', scrub: true }});
  }

  const LERP_FACTOR = 0.06;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    if (!active) return;
    rafParallax = requestAnimationFrame(tick);

    // Layer 1: Status tag — moves most (closest to viewer)
    cx = lerp(cx, mx * 14, LERP_FACTOR);
    cy = lerp(cy, my * 10, LERP_FACTOR);
    if (tag) tag.style.transform = `translate(${cx}px, ${cy}px)`;

    // Layer 2: Headline — moves less (further away)
    hx = lerp(hx, mx * 6, LERP_FACTOR);
    hy = lerp(hy, my * 4, LERP_FACTOR);
    if (headline) gsap.set(headline, { x: hx, y: hy });

    // Layer 3: Canvas — moves subtly in opposite direction (depth illusion)
    nx = lerp(nx, -mx * 18, LERP_FACTOR * 0.7);
    ny = lerp(ny, -my * 12, LERP_FACTOR * 0.7);
    if (canvas) gsap.set(canvas, { x: nx, y: ny });

    // Layer 4: Cinematic Background - Depth parallax
    mdx = lerp(mdx, mx * 3, LERP_FACTOR);
    mdy = lerp(mdy, my * 2, LERP_FACTOR);
    if (mDistant) gsap.set(mDistant, { x: mdx, y: mdy });

    mmx = lerp(mmx, mx * 6, LERP_FACTOR);
    mmy = lerp(mmy, my * 4, LERP_FACTOR);
    if (mMiddle) gsap.set(mMiddle, { x: mmx, y: mmy });

    mfx = lerp(mfx, mx * 12, LERP_FACTOR);
    mfy = lerp(mfy, my * 8, LERP_FACTOR);
    if (mFore) gsap.set(mFore, { x: mfx, y: mfy });

    mox = lerp(mox, mx * 2, LERP_FACTOR * 0.4);
    moy = lerp(moy, my * 1, LERP_FACTOR * 0.4);
    if (moon) gsap.set(moon, { x: mox, y: moy });
  }

  rafParallax = requestAnimationFrame(tick);
}


/* 6c. Unified Section Reveals */
(function initSectionReveals() {
  if (typeof gsap === 'undefined') return;

  // ── Pattern 0: Engineer Visual Cinematic Reveal & Parallax
  const engImg = document.querySelector('.engineer-visual-img');
  if (engImg) {
    // Parallax on scroll (enabled for all breakpoints)
    gsap.fromTo(engImg, 
      { yPercent: -15 },
      {
        yPercent: 15,
        ease: 'none',
        scrollTrigger: {
          trigger: '.engineer-layout-grid',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.2
        }
      }
    );

    // Entrance Reveal
    gsap.fromTo(engImg,
      { opacity: 0, scale: 1.05 },
      {
        opacity: 1, scale: 1,
        duration: M.dur.epic,
        ease: M.gsap.expo,
        scrollTrigger: {
          trigger: '.engineer-layout-grid',
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      }
    );
  }

  // ── Pattern 1: Heading line clips (overflow: hidden parent needed)
  // Applied to h2 elements with data-reveal="line" attribute or class
  gsap.utils.toArray('h2.journey-title, h2.work-title, h2.proof-title, h2.arsenal-title').forEach((heading) => {
    // Wrap each line's text in a clip container if not already
    const inner = heading.querySelector('.line-inner') || heading;
    gsap.fromTo(heading,
      { y: 50, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: M.dur.slow,
        ease: M.gsap.expo,
        scrollTrigger: {
          trigger: heading,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // ── Pattern 2: Staggered fade-up (cards, paragraphs, meta)
  const staggerGroups = [
    { selector: '.journey-node',    stagger: M.stagger,    y: 40 },
    { selector: '.proof-card',      stagger: M.stagger,    y: 30 },
    { selector: '.contact-narrative p', stagger: M.stagger * 0.5, y: 24 },
    { selector: '.journey-header',  stagger: 0,            y: 30 },
    { selector: '.proof-header',    stagger: 0,            y: 30 },
    { selector: '.contact-epic-header', stagger: 0,        y: 40 },
    { selector: '.contact-grid > *', stagger: 0.14,        y: 30 },
    { selector: '.feedback-conclusion', stagger: 0,        y: 20 },
    { selector: '.chapter-headline', stagger: 0,           y: 50 },
    { selector: '.chapter-prose p',  stagger: M.stagger,   y: 30 },
    { selector: '.edu-node',         stagger: M.stagger,   y: 20 },
    { selector: '.milestone-card',   stagger: M.stagger * 1.5, y: 30 },
    { selector: '.exp-item',         stagger: M.stagger * 1.5, y: 30 },
    { selector: '.vision-col',       stagger: M.stagger * 2,   y: 40 },
    { selector: '.bento-card',       stagger: M.stagger,       y: 40 }
  ];

  staggerGroups.forEach(({ selector, stagger, y }) => {
    const els = document.querySelectorAll(selector);
    if (!els.length) return;

    gsap.fromTo(els,
      { y, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: M.dur.slow,
        ease: M.gsap.expo,
        stagger,
        scrollTrigger: {
          trigger: els[0].closest('section') || els[0],
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // ── Pattern 3: Scale reveal (images, certificate cards)
  gsap.utils.toArray('.proof-img-wrap').forEach((el) => {
    gsap.fromTo(el,
      { scale: 1.06, opacity: 0 },
      {
        scale: 1, opacity: 1,
        duration: M.dur.slow,
        ease: M.gsap.expo,
        scrollTrigger: {
          trigger: el,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // ── Pattern 4: Blur reveal (work project titles)
  gsap.utils.toArray('.work-project-title').forEach((el) => {
    gsap.fromTo(el,
      { opacity: 0, filter: 'blur(8px)', y: 16 },
      {
        opacity: 1, filter: 'blur(0px)', y: 0,
        duration: M.dur.normal,
        ease: M.gsap.expo,
        scrollTrigger: {
          trigger: el,
          start: 'top 92%',
          toggleActions: 'play none none none',
        },
      }
    );
  });
})();

/* 6d. Horizontal Project Scroll Pin */
(function initProjectScroll() {
  if (typeof gsap === 'undefined') return;

  const workTrack = document.getElementById('workTrack');
  if (!workTrack) return;

  function getScrollAmount() {
    return -(workTrack.scrollWidth - window.innerWidth);
  }

  const tween = gsap.to(workTrack, {
    x: getScrollAmount,
    ease: M.gsap.none,
    paused: true,
  });

  ScrollTrigger.create({
    trigger: '.work-section',
    start: 'top top',
    end: () => `+=${Math.abs(getScrollAmount())}`,
    pin: true,
    pinSpacing: true,
    animation: tween,
    scrub: 1.0,
    invalidateOnRefresh: true,
    anticipatePin: 1,
  });

  // FINAL FIX: Never set opacity on .work-card itself.
  // - opacity < 1 on a card creates a CSS stacking context, trapping child
  //   z-indexes and allowing .work-header (in parent stacking context) to
  //   paint over interactive elements regardless of their z-index values.
  // - We animate the two children separately with a one-shot (non-scrubbed)
  //   entrance. The card itself is always opacity:1, always interactive.
  gsap.utils.toArray('.work-card').forEach((card, i) => {
    const mockup = card.querySelector('.work-mockup-wrap');
    const info   = card.querySelector('.work-info-panel');

    const isFirst = i === 0;

    if (mockup) {
      gsap.from(mockup, {
        opacity: 0, x: -20,
        duration: 0.7, ease: 'power3.out',
        scrollTrigger: isFirst ? {
          trigger: '.work-section',
          start: 'top 60%',
          toggleActions: 'play none none none',
        } : {
          trigger: card,
          containerAnimation: tween,
          start: 'left 95%',
          toggleActions: 'play none none none',
        },
      });
    }
    if (info) {
      gsap.from(info, {
        opacity: 0, x: 20,
        duration: 0.7, ease: 'power3.out', delay: 0.1,
        scrollTrigger: isFirst ? {
          trigger: '.work-section',
          start: 'top 60%',
          toggleActions: 'play none none none',
        } : {
          trigger: card,
          containerAnimation: tween,
          start: 'left 95%',
          toggleActions: 'play none none none',
        },
      });
    }
  });
})();

/* 6e. Journey SVG Line Draw */
(function initJourneyDraw() {
  if (typeof gsap === 'undefined') return;

  const line = document.querySelector('.journey-line-glow');
  if (!line) return;

  const len = line.getTotalLength ? line.getTotalLength() : 1000;
  gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });

  gsap.to(line, {
    strokeDashoffset: 0,
    ease: M.gsap.none,
    scrollTrigger: {
      trigger: '.journey-path-container',
      start: 'top 60%',
      end: 'bottom 40%',
      scrub: 1,
    },
  });

  // Journey nodes pulse when entering viewport
  document.querySelectorAll('.journey-dot').forEach((dot) => {
    ScrollTrigger.create({
      trigger: dot,
      start: 'top 85%',
      onEnter: () => {
        dot.style.animation = 'dot-pulse 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 3';
        dot.style.borderColor = 'rgba(255,255,255,0.6)';
      },
    });
  });
})();

/* 6f. Parallax layers (desktop only) */
(function initParallax() {
  if (typeof gsap === 'undefined') return;

  const mm = gsap.matchMedia();
  mm.add('(min-width: 769px)', () => {
    // Proof certificates parallax
    gsap.utils.toArray('.parallax-item').forEach((item) => {
      const speed = parseFloat(item.style.getPropertyValue('--parallax-speed')) || 0.25;
      gsap.to(item, {
        yPercent: -12 * speed * 10,
        ease: M.gsap.none,
        scrollTrigger: {
          trigger: '.proof-collage',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });
    });

    // Section headings subtle drift upward (depth feel)
    gsap.utils.toArray('.proof-header, .contact-epic-header').forEach((el) => {
      gsap.to(el, {
        y: -30,
        ease: M.gsap.none,
        scrollTrigger: {
          trigger: el.closest('section'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });

    // Hero ambient glow parallax (moves up slowly as user scrolls)
    const glow = document.querySelector('.hero-ambient-glow');
    if (glow) {
      gsap.to(glow, {
        y: -80,
        ease: M.gsap.none,
        scrollTrigger: {
          trigger: '.hero-sequence',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }
  });
})();


/* ══════════════════════════════════════════════════════════════
   7. PROJECT CARD 3D TILT
   ══════════════════════════════════════════════════════════════ */
(function initCardTilt() {
  const mm = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 769px)');
  if (!mm.matches) return;

  const cards = document.querySelectorAll('.work-card');

  cards.forEach((card) => {
    const panel = card.closest('.work-panel');

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      // Offset from center (-1 to 1)
      const dx = (e.clientX - cx) / (rect.width  / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);

      const MAX_ROT = 4; // degrees
      const rotY =  dx * MAX_ROT;
      const rotX = -dy * MAX_ROT;

      // Apply via GSAP for smooth follow
      gsap.to(card, {
        rotateX: rotX,
        rotateY: rotY,
        transformStyle: 'preserve-3d',
        duration: 0.5,
        ease: M.gsap.smooth,
        force3D: true,
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: M.dur.slow,
        ease: M.gsap.spring,
        force3D: true,
      });
    });
  });
})();


/* ══════════════════════════════════════════════════════════════
   8. MAGNETIC BUTTONS
   ══════════════════════════════════════════════════════════════ */
(function initMagneticButtons() {
  const mm = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!mm.matches) return;

  const buttons = document.querySelectorAll('.btn-premium, .btn-outline, .menu-toggle');

  buttons.forEach((btn) => {
    const STRENGTH = 0.25; // 0 = no magnetism, 1 = full magnetism

    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) * STRENGTH;
      const dy   = (e.clientY - cy) * STRENGTH;

      gsap.to(btn, {
        x: dx,
        y: dy,
        duration: M.dur.normal,
        ease: M.gsap.smooth,
        force3D: true,
      });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: M.dur.slow,
        ease: M.gsap.spring,
        force3D: true,
      });
    });

    // Click ripple class
    btn.addEventListener('mousedown', () => {
      btn.classList.add('ripple-active');
      setTimeout(() => btn.classList.remove('ripple-active'), 400);
    });
  });
})();


/* ══════════════════════════════════════════════════════════════
   9. SCROLL INDICATOR — Hero scroll cue hide/reveal
   ══════════════════════════════════════════════════════════════ */
(function initScrollCue() {
  if (typeof gsap === 'undefined') return;

  const cue = document.getElementById('heroScrollCue');
  if (!cue) return;

  ScrollTrigger.create({
    trigger: '.hero-sequence',
    start: 'top top',
    end: '25% top',
    onLeave:      () => gsap.to(cue, { opacity: 0, y: -10, duration: M.dur.normal, ease: M.gsap.out }),
    onEnterBack:  () => gsap.to(cue, { opacity: 1, y: 0,   duration: M.dur.normal, ease: M.gsap.out }),
  });
})();


/* ══════════════════════════════════════════════════════════════
   10. INTERACTIVE ECOSYSTEM GRAPH
   ══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   10. ECOSYSTEM BENTO GLOW EFFECT
   ══════════════════════════════════════════════════════════════ */
(function initBentoGlow() {
  const cards = document.querySelectorAll('.bento-card');
  if (!cards.length) return;

  document.getElementById('ecosystemBento')?.addEventListener('mousemove', (e) => {
    for(const card of cards) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    }
  });
})();


/* ══════════════════════════════════════════════════════════════
   11. CAREER JOURNEY TIMELINE
   ══════════════════════════════════════════════════════════════ */
(function initCareerJourney() {
  const dataIsland = document.getElementById('career-journey-data');
  const nodesList = document.getElementById('cjNodesList');
  const panelContent = document.getElementById('cjPanelContent');
  const progressLine = document.getElementById('cjProgress');
  
  if (!dataIsland || !nodesList || !panelContent || !progressLine) return;
  
  let milestones = [];
  try {
    milestones = JSON.parse(dataIsland.textContent);
  } catch(e) {
    console.error("Failed to parse career journey data", e);
    return;
  }
  

  
  // Helper to get color/icon based on type
  const getTypeMeta = (type) => {
    const meta = {
      'education': { icon: 'bi-journal-bookmark', color: '#818cf8' },
      'internship': { icon: 'bi-briefcase', color: '#34d399' },
      'project': { icon: 'bi-code-square', color: '#f472b6' },
      'achievement': { icon: 'bi-trophy', color: '#fbbf24' },
      'certification': { icon: 'bi-patch-check', color: '#38bdf8' },
      'vision': { icon: 'bi-eye', color: '#c084fc' }
    };
    return meta[type] || { icon: 'bi-star', color: '#ffffff' };
  };
  
  // Render nodes
  nodesList.innerHTML = milestones.map((m, i) => {
    const meta = getTypeMeta(m.type);
    return `
      <button class="cj-node group flex items-center gap-[2rem] bg-none border-none cursor-pointer text-left outline-none opacity-50 transition-opacity duration-[0.4s] hover:opacity-100 [&.active]:opacity-100 max-md:flex-col max-md:items-center max-md:text-center max-md:w-[140px] max-md:gap-[1rem] max-md:snap-center w-full ${i===0 ? 'active' : ''}" data-index="${i}" aria-label="View ${m.title}">
        <div class="shrink-0 w-[50px] h-[50px] rounded-full bg-[rgba(255,255,255,0.03)] border-2 border-current flex items-center justify-center text-[1.2rem] shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-[0.4s] group-hover:scale-110 group-hover:shadow-[0_0_20px_currentColor] group-[.active]:scale-110 group-[.active]:shadow-[0_0_20px_currentColor] group-hover:bg-[rgba(255,255,255,0.1)] group-[.active]:bg-[rgba(255,255,255,0.1)] max-md:w-[40px] max-md:h-[40px] max-md:text-[1rem] relative z-[3] bg-[#000]" style="color: ${meta.color}"><i class="bi ${meta.icon}"></i></div>
        <div class="flex flex-col gap-[0.2rem]">
          <span class="font-mono text-[0.85rem] font-bold tracking-[0.1em] opacity-80 max-md:text-[0.75rem] max-md:whitespace-nowrap" style="color: ${meta.color}">${m.year}</span>
          <span class="font-sans text-[1.1rem] text-[rgba(255,255,255,0.9)] max-md:text-[0.9rem] max-md:leading-[1.2] max-md:line-clamp-2">${m.title}</span>
        </div>
      </button>
    `;
  }).join('');
  
  const nodeEls = document.querySelectorAll('.cj-node');
  
  // Render detail panel
  const renderPanel = (index) => {
    const m = milestones[index];
    const meta = getTypeMeta(m.type);
    
    let html = `
      <div class="mb-[2rem] pb-[1.5rem] border-b border-[rgba(255,255,255,0.1)]">
        <div class="flex items-center gap-[1rem] mb-[1rem] font-mono text-[0.8rem] tracking-[0.1em] uppercase max-md:text-[0.7rem] max-md:flex-wrap">
          <span class="text-[var(--node-color)] px-[10px] py-[4px] bg-[color-mix(in_srgb,var(--node-color)_15%,transparent)] rounded-[4px] border border-[color-mix(in_srgb,var(--node-color)_30%,transparent)] font-bold" style="--node-color: ${meta.color}">${m.year}</span>
          <span class="text-[rgba(255,255,255,0.5)]">${m.type}</span>
        </div>
        <h3 class="font-display text-[2rem] leading-[1.2] font-bold text-text-primary mb-[0.5rem] max-md:text-[1.5rem]">${m.title}</h3>
        <div class="font-sans text-[1.1rem] text-[rgba(255,255,255,0.7)] max-md:text-[0.95rem]">${m.institution} | ${m.role}</div>
      </div>
      <p class="font-sans text-[1.05rem] leading-[1.7] text-text-secondary mb-[2rem] max-md:text-[0.95rem]">${m.description}</p>
    `;
    
    if ((m.technologies && m.technologies.length) || (m.skills && m.skills.length) || (m.achievements && m.achievements.length)) {
      html += `<div class="grid grid-cols-2 gap-[2rem] max-md:grid-cols-1">`;
      
      if (m.technologies && m.technologies.length) {
        html += `<div class="flex flex-col"><h4 class="font-mono text-[0.75rem] tracking-[0.15em] uppercase text-[rgba(255,255,255,0.4)] mb-[1rem]">Technologies</h4><div class="flex flex-wrap gap-[0.5rem]">`;
        m.technologies.forEach(t => html += `<span class="font-sans text-[0.8rem] px-[12px] py-[6px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[6px] text-[rgba(255,255,255,0.8)]">${t}</span>`);
        html += `</div></div>`;
      }
      
      if (m.skills && m.skills.length) {
        html += `<div class="flex flex-col"><h4 class="font-mono text-[0.75rem] tracking-[0.15em] uppercase text-[rgba(255,255,255,0.4)] mb-[1rem]">Skills Gained</h4><div class="flex flex-wrap gap-[0.5rem]">`;
        m.skills.forEach(s => html += `<span class="font-sans text-[0.8rem] px-[12px] py-[6px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[6px] text-[rgba(255,255,255,0.8)]">${s}</span>`);
        html += `</div></div>`;
      }
      
      if (m.achievements && m.achievements.length) {
        html += `<div class="flex flex-col"><h4 class="font-mono text-[0.75rem] tracking-[0.15em] uppercase text-[rgba(255,255,255,0.4)] mb-[1rem]">Highlights</h4><ul class="list-none p-0 m-0 flex flex-col gap-[0.5rem]" style="--node-color: ${meta.color}">`;
        m.achievements.forEach(a => html += `<li class="relative pl-[1.5rem] font-sans text-[0.9rem] leading-[1.5] text-[rgba(255,255,255,0.7)] before:content-['▹'] before:absolute before:left-0 before:text-[var(--node-color)]">${a}</li>`);
        html += `</ul></div>`;
      }
      
      html += `</div>`;
    }
    
    panelContent.innerHTML = html;
    
    // Update container glow
    const container = document.querySelector('.career-panel-container');
    container.style.boxShadow = `0 10px 40px -10px ${meta.color}40`;
    container.style.borderColor = `${meta.color}40`;
  };
  
  // State update logic
  const updateTimeline = (index) => {
    // Progress line (vertical track)
    const ratio = index / Math.max(1, (milestones.length - 1));
    const percentage = ratio * 100;
    
    if (window.innerWidth <= 768) {
      progressLine.style.height = '100%';
      progressLine.style.width = `${percentage}%`;
    } else {
      progressLine.style.width = '100%';
      progressLine.style.height = `${percentage}%`;
    }
    
    const m = milestones[index];
    const meta = getTypeMeta(m.type);
    progressLine.style.backgroundColor = meta.color;
    
    nodeEls.forEach((node, i) => {
      node.classList.toggle('active', i === index);
    });
    
    // Auto-scroll track to active node if necessary
    const activeNode = nodeEls[index];
    if (activeNode) {
      const track = document.querySelector('.career-track-container');
      if (window.innerWidth <= 768) {
        const offsetLeft = activeNode.offsetLeft;
        if (offsetLeft < track.scrollLeft || offsetLeft > track.scrollLeft + track.clientWidth - 50) {
          track.scrollTo({ left: offsetLeft - 50, behavior: 'smooth' });
        }
      } else {
        const offsetTop = activeNode.offsetTop;
        if (offsetTop < track.scrollTop || offsetTop > track.scrollTop + track.clientHeight - 50) {
          track.scrollTo({ top: offsetTop - 50, behavior: 'smooth' });
        }
      }
    }
    
    // GSAP morph animation
    if (typeof gsap !== 'undefined') {
      gsap.to(panelContent, {
        opacity: 0,
        y: -15,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          renderPanel(index);
          gsap.fromTo(panelContent, 
            { opacity: 0, y: 15 }, 
            { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
          );
        }
      });
    } else {
      renderPanel(index);
      panelContent.style.opacity = 1;
      panelContent.style.transform = 'none';
    }
  };
  
  nodeEls.forEach((node) => {
    node.addEventListener('click', () => {
      const index = parseInt(node.getAttribute('data-index'), 10);
      updateTimeline(index);
    });
  });
  
  // Init first panel instantly without exit animation
  renderPanel(0);
  if (typeof gsap !== 'undefined') {
    gsap.to(panelContent, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
  }
  updateTimeline(0);
  
})();



/* ══════════════════════════════════════════════════════════════
   9. PREMIUM CINEMATIC FOOTER
   ══════════════════════════════════════════════════════════════ */
(function initCinematicFooter() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const footer = document.getElementById('premiumFooter');
  if (!footer) return;

  // 1. Footer Fade in from below when entering viewport
  const reveals = footer.querySelectorAll('.reveal-footer');
  if (reveals.length) {
    gsap.fromTo(reveals,
      { y: 40, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: footer,
          start: 'top 85%',
        }
      }
    );
  }

  // 2. Parallax on huge background name
  const nameText = document.getElementById('footerNameText');
  if (nameText) {
    gsap.to(nameText, {
      y: -20, // Moves upward 20px while scrolling down
      ease: 'none',
      scrollTrigger: {
        trigger: footer,
        start: 'top bottom',
        end: 'bottom bottom',
        scrub: true,
      }
    });
  }

  // 3. Mouse Movement Glow
  const mouseGlow = document.getElementById('footerMouseGlow');
  if (mouseGlow && window.matchMedia('(min-width: 768px)').matches) {
    footer.addEventListener('mousemove', (e) => {
      const rect = footer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseGlow.style.setProperty('--mouse-x', `${x}px`);
      mouseGlow.style.setProperty('--mouse-y', `${y}px`);
    });
  }

  // 4. Subtle Floating Particles
  const particlesContainer = document.getElementById('footerParticles');
  if (particlesContainer) {
    const numParticles = 12;
    for (let i = 0; i < numParticles; i++) {
      const p = document.createElement('div');
      p.classList.add('footer-particle');
      
      const size = Math.random() * 3 + 1;
      const startX = Math.random() * 100;
      const startY = Math.random() * 100;
      
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${startX}%`;
      p.style.top = `${startY}%`;
      p.style.opacity = Math.random() * 0.15 + 0.05;
      
      particlesContainer.appendChild(p);

      gsap.to(p, {
        y: `-=${Math.random() * 40 + 20}`,
        x: `+=${(Math.random() - 0.5) * 30}`,
        opacity: 0,
        duration: Math.random() * 5 + 5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: Math.random() * -5
      });
    }
  }
})();

/* ══════════════════════════════════════════════════════════════
   10. SHOOTING STARS (HERO)
   ══════════════════════════════════════════════════════════════ */
(function initShootingStars() {
  const container = document.getElementById('heroShootingStars');
  if (!container) return;

  let running = true;
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.create({
      trigger: '.hero-sequence',
      start: 'top bottom',
      end: 'bottom top',
      onLeave: () => { running = false; },
      onEnter: () => { running = true; scheduleNextStar(); },
      onEnterBack: () => { running = true; scheduleNextStar(); }
    });
  }

  function createStar() {
    if (!running) return;

    // Allow max 25 stars at a time
    if (container.children.length >= 25) {
      scheduleNextStar();
      return;
    }

    const star = document.createElement('div');
    star.className = 'shooting-star';
    
    // Fully randomize start position anywhere across the top
    const startY = -10 + Math.random() * 30; // Start slightly above or in the top 20%
    const startX = Math.random() * 100; // Start anywhere horizontally (0% to 100%)
    
    // Randomize direction (left-bound or right-bound)
    const isRightToLeft = Math.random() > 0.5;
    
    let distanceX;
    if (isRightToLeft) {
      distanceX = -40 - Math.random() * 40; // Travel left between 40vw and 80vw
    } else {
      distanceX = 40 + Math.random() * 40; // Travel right between 40vw and 80vw
    }
    
    star.style.top = `${startY}%`;
    star.style.left = `${startX}%`;
    
    // Random scale for variation
    const scale = 0.5 + Math.random() * 0.5;
    
    container.appendChild(star);
    
    const duration = 2.0 + Math.random() * 1.5;
    
    // Randomize the angle (steepness of the fall)
    const angleMultiplier = 0.1 + Math.random() * 0.4; // Multiplier between 0.1 and 0.5
    const distanceY = Math.abs(distanceX) * angleMultiplier;

    // Calculate the exact rotation angle to match the physics trajectory
    const angleRad = Math.atan2(distanceY, distanceX);
    const angleDeg = angleRad * (180 / Math.PI);
    
    // Apply exact rotation so the tail aligns perfectly with movement
    gsap.set(star, { rotation: angleDeg });

    // Movement (Linear)
    gsap.to(star, {
      x: `${distanceX}vw`,
      y: `${distanceY}vw`,
      duration: duration,
      ease: 'none',
      onComplete: () => {
        if(star.parentNode) star.remove();
        scheduleNextStar();
      }
    });

    // Opacity & Scale (Fade in then fade out)
    gsap.fromTo(star, { opacity: 0, scale: 0 }, {
      opacity: 1,
      scale: scale,
      duration: duration * 0.1,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(star, {
          opacity: 0,
          scale: 0,
          duration: duration * 0.9,
          ease: 'none'
        });
      }
    });
  }

  let timeoutId = null;
  function scheduleNextStar() {
    if (!running) return;
    clearTimeout(timeoutId);
    // Randomize heavily: 1 star every 0.1 to 1.5 seconds
    const delay = 100 + Math.random() * 1400;
    timeoutId = setTimeout(createStar, delay);
  }

  // Start the loop after a small initial delay
  timeoutId = setTimeout(scheduleNextStar, 2000);
})();