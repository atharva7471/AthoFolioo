/**
 * app.js — Data & Interaction Layer
 * ─────────────────────────────────────────────────────────────
 * This file handles ONLY data-driven logic:
 *   - Project modal (open/close + populate)
 *   - Achievement modal (open/close + populate)
 *   - Comments API fetch + slider rotation
 *   - Contact form async submit
 *
 * All animations, motion, and scroll behaviour live in motion.js.
 * Lenis instance is accessed via window._lenis (set by motion.js).
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

/* Convenience accessor — motion.js always runs first */
function getLenis() {
  return window._lenis || null;
}


/* ══════════════════════════════════════════════════════════════
   PROJECT MODAL  (desktop + mobile dual-panel)
   ══════════════════════════════════════════════════════════════ */
(function initProjectModal() {
  const modal = document.getElementById('projModal') || document.getElementById('projectModal');
  if (!modal) return;

  const backdrop = modal.querySelector('.proj-modal-backdrop') || document.getElementById('projModalBackdrop');
  const closeBtns = modal.querySelectorAll('.proj-modal-close'); 

  // Unified DOM nodes
  const modalImg   = document.getElementById('projModalImg') || document.getElementById('modalImg');
  const modalTitle = document.getElementById('projModalTitle') || document.getElementById('modalTitle');
  const modalDesc  = document.getElementById('projModalDesc') || document.getElementById('modalDesc');
  const modalTech  = document.getElementById('projModalTech') || document.getElementById('modalTech');
  const modalLinks = document.getElementById('projModalLinks') || document.getElementById('modalLinks');
  const modalNum   = document.getElementById('projModalNum') || document.getElementById('modalNumMobile');
  const modalCat   = document.getElementById('projModalCat');

  // Focus management
  let previousActiveElement = null;

  // ── Tag builder ────────────────────────────────────────────────
  function buildTags(tech) {
    const cls = 'font-sans text-[0.7rem] font-semibold tracking-[0.06em] uppercase text-white/80 bg-white/5 border border-white/10 rounded-md px-3 py-1.5';
    return (tech || '').split(',').filter(Boolean)
      .map(t => `<span class="${cls}">${t.trim()}</span>`).join('');
  }

  // ── Link builder ───────────────────────────────────────────────
  function buildLinks(live, github) {
    const baseCls = 'inline-flex items-center gap-2 font-sans text-[0.85rem] font-semibold text-white bg-white/5 border border-white/15 rounded-full px-6 py-3 no-underline transition-all duration-300 cursor-pointer hover:bg-white hover:text-black hover:border-white hover:-translate-y-0.5';
    const primaryCls = 'inline-flex items-center gap-2 font-sans text-[0.85rem] font-semibold text-black bg-white border border-white rounded-full px-6 py-3 no-underline transition-all duration-300 cursor-pointer hover:bg-gray-200 hover:-translate-y-0.5';
    let h = '';
    if (github) h += `<a href="${github}" target="_blank" rel="noopener noreferrer" class="${baseCls}"><i class="bi bi-github"></i> Source Code</a>`;
    if (live)   h += `<a href="${live}" target="_blank" rel="noopener noreferrer" class="${primaryCls}">Live Demo <i class="bi bi-arrow-up-right"></i></a>`;
    return h;
  }

  function openModal(card, triggerBtn) {
    previousActiveElement = triggerBtn || document.activeElement;
    const { title, desc, img, live, github, tech, index } = card.dataset;

    // Project category
    let category = 'Software Engineering';
    const ft = (tech || '').split(',')[0]?.toLowerCase() || '';
    if (ft.includes('python') || ft.includes('ml') || ft.includes('machine')) category = 'AI / Machine Learning';
    else if (ft.includes('react') || ft.includes('next') || ft.includes('vue')) category = 'Frontend / Web';
    else if (ft.includes('node') || ft.includes('flask') || ft.includes('django')) category = 'Full Stack';
    else if (ft.includes('matlab') || ft.includes('simulink')) category = 'Engineering';
    else if (ft.includes('android') || ft.includes('kotlin') || ft.includes('swift')) category = 'Mobile';

    // Populate
    if (modalImg)   { modalImg.src = img || ''; modalImg.alt = title + ' preview'; }
    if (modalTitle) modalTitle.textContent = title || '';
    if (modalDesc)  modalDesc.textContent  = desc  || '';
    if (modalTech)  modalTech.innerHTML    = buildTags(tech);
    if (modalLinks) modalLinks.innerHTML   = buildLinks(live, github);
    if (modalNum)   modalNum.textContent   = index || '01';
    if (modalCat)   modalCat.textContent   = category;

    // Reset scroll position
    const scrollContainer = modal.querySelector('.proj-modal-scroll') || modal.querySelector('.overflow-y-auto');
    if (scrollContainer) scrollContainer.scrollTop = 0;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    if (typeof getLenis === 'function') {
      getLenis()?.stop();
    }

    const firstCloseBtn = closeBtns[0] || modal.querySelector('#projModalClose');
    if (firstCloseBtn) {
      setTimeout(() => firstCloseBtn.focus(), 100);
    }
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    
    if (typeof getLenis === 'function') {
      getLenis()?.start();
    }

    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }
  }

  document.addEventListener('click', (e) => {
    const projItem = e.target.closest('[data-proj-item]');
    if (projItem) {
      openModal(projItem, e.target.closest('button') || projItem);
      return;
    }
    const workItem = e.target.closest('[data-work-item]');
    if (workItem) {
      openModal(workItem, e.target.closest('button') || workItem);
      return;
    }
    const btn = e.target.closest('.view-project-btn');
    if (btn) {
      const card = btn.closest('.project-card') || btn;
      openModal(card, btn);
    }
  });

  if (backdrop) backdrop.addEventListener('click', closeModal);
  if (closeBtns) closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
  const closeBtnId = document.getElementById('projModalClose');
  if (closeBtnId) closeBtnId.addEventListener('click', closeModal);
  
  document.addEventListener('keydown', (e) => { 
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });
})();


/* ══════════════════════════════════════════════════════════════
   ACHIEVEMENT MODAL
   ══════════════════════════════════════════════════════════════ */
(function initAchievementModal() {
  const modal    = document.getElementById('achModal');
  if (!modal) return;

  const backdrop  = document.getElementById('achModalBackdrop');
  const closeBtn  = document.getElementById('achModalClose');

  function openModal(card) {
    const { title, event, desc, date, icon, image } = card.dataset;

    const elIcon    = document.getElementById('achModalIcon');
    const elTitle   = document.getElementById('achModalTitle');
    const elDesc    = document.getElementById('achModalDesc');
    const elEvent   = document.getElementById('achModalEventText');
    const elDate    = document.getElementById('achModalDateText');
    const photoWrap = document.getElementById('achModalPhotoWrap');
    const photoImg  = document.getElementById('achModalPhoto');
    const medalWrap = document.getElementById('achModalMedal');

    if (elIcon)  elIcon.className  = 'bi ' + (icon || 'bi-trophy-fill');
    if (elTitle) elTitle.textContent = title || '';
    if (elDesc)  elDesc.textContent  = desc  || '';
    if (elEvent) elEvent.textContent = event || '';
    if (elDate)  elDate.textContent  = date  || '';

    if (image && photoWrap && photoImg) {
      photoImg.src = image;
      photoWrap.style.display = 'block';
      if (medalWrap) medalWrap.style.display = 'none';
    } else {
      if (photoWrap) photoWrap.style.display = 'none';
      if (medalWrap) medalWrap.style.display = 'flex';
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    getLenis()?.stop();
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    getLenis()?.start();
  }

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.ach-card');
    if (card) openModal(card);
  });

  backdrop?.addEventListener('click', closeModal);
  closeBtn?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
})();


/* ══════════════════════════════════════════════════════════════
   COMMENTS SLIDER + CONTACT FORM
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Comments Slider ──────────────────────────────────────── */
  const container = document.getElementById('commentsContainer');
  const prevBtn = document.getElementById('prevTestimonial');
  const nextBtn = document.getElementById('nextTestimonial');
  const indicatorsContainer = document.getElementById('testimonialIndicators');
  const wrapper = document.getElementById('commentsContainer');
  
  let slides = [];
  let currentIndex = 0;
  let sliderTimer = null;
  const ROTATE_DELAY = 6000;

  function goToSlide(index) {
    if (slides.length <= 1) return;
    
    slides[currentIndex].classList.remove('active');
    slides[currentIndex].classList.add('exit');
    
    // Slight delay before removing exit class to allow CSS transition
    setTimeout(() => {
      slides.forEach(s => s.classList.remove('exit'));
    }, 600);
    
    currentIndex = index;
    slides[currentIndex].classList.add('active');
    updateIndicator();
  }

  function updateIndicator() {
    if (indicatorsContainer && slides.length > 0) {
      const current = (currentIndex + 1).toString().padStart(2, '0');
      const total = slides.length.toString().padStart(2, '0');
      indicatorsContainer.innerHTML = `<span class="text-primary">${current}</span><span class="mx-[0.5rem] opacity-30">/</span><span>${total}</span>`;
    }
  }

  function nextSlide() {
    goToSlide((currentIndex + 1) % slides.length);
  }

  function prevSlide() {
    goToSlide((currentIndex - 1 + slides.length) % slides.length);
  }

  function startAutoRotate() {
    if (slides.length > 1) {
      if (sliderTimer) clearInterval(sliderTimer);
      sliderTimer = setInterval(nextSlide, ROTATE_DELAY);
    }
  }

  function stopAutoRotate() {
    if (sliderTimer) clearInterval(sliderTimer);
  }

  function renderComments(comments) {
    if (!container) return;

    if (!comments || comments.length === 0) {
      container.innerHTML = `
        <div class="p-[4rem_2rem] text-center bg-[rgba(15,15,18,0.3)] rounded-[24px] border border-dashed border-[rgba(255,255,255,0.1)] w-full">
          <i class="bi bi-chat-quote text-[3rem] text-[rgba(255,255,255,0.1)] mb-[1rem] block"></i>
          <p class="text-[1.2rem] text-text-secondary">Be the first to leave your thoughts.</p>
        </div>`;
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      return;
    }

    container.innerHTML = '';
    if (indicatorsContainer) indicatorsContainer.innerHTML = '';
    
    comments.forEach((c, i) => {
      const slide = document.createElement('div');
      slide.className = 'testimonial-slide absolute inset-0 opacity-0 invisible scale-[0.95] translate-x-[20px] transition-all duration-[0.6s] ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center [&.active]:opacity-100 [&.active]:visible [&.active]:scale-100 [&.active]:translate-x-0 [&.exit]:scale-[0.95] [&.exit]:-translate-x-[20px]' + (i === 0 ? ' active' : '');
      
      const dateObj = new Date(c.created_at);
      const dateStr = c.created_at ? dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
      const roleStr = c.role ? `<div class="text-[0.85rem] text-text-muted mt-[0.2rem] font-sans tracking-wide uppercase">${c.role}</div>` : '';
      
      slide.innerHTML = `
        <div class="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[16px] p-[clamp(2rem,5vw,3.5rem)] relative overflow-hidden transition-all duration-500 hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(74,144,226,0.2)] hover:shadow-[0_0_30px_rgba(74,144,226,0.05)] group">
          <!-- Subtle glow line top -->
          <div class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(74,144,226,0.3)] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
          
          <i class="bi bi-quote text-[clamp(2rem,4vw,3rem)] text-[rgba(74,144,226,0.3)] absolute top-[1.5rem] right-[2rem] leading-none"></i>
          
          <div class="text-[clamp(1.1rem,3vw,1.4rem)] text-text-primary leading-[1.6] mb-[2.5rem] font-serif relative z-10 font-light pr-[2rem]">"${c.message}"</div>
          
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-[1.5rem] pt-[2rem] border-t border-[rgba(255,255,255,0.05)]">
            <div class="flex flex-col text-left">
              <div class="font-sans font-medium text-[1.1rem] text-text-primary tracking-wide">${c.name}</div>
              ${roleStr}
            </div>
            
            <div class="flex flex-col sm:items-end text-left sm:text-right gap-[0.5rem]">
              <div class="text-[#ffd700] text-[0.85rem] flex gap-[0.2rem]">
                <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i>
              </div>
              <div class="text-[0.8rem] text-text-muted font-mono tracking-widest uppercase">${dateStr}</div>
            </div>
          </div>
        </div>`;
      container.appendChild(slide);
    });

    slides = Array.from(container.querySelectorAll('.testimonial-slide'));
    updateIndicator();

    if (slides.length <= 1) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
    } else {
      startAutoRotate();
      
      if (prevBtn) {
        prevBtn.addEventListener('click', () => { prevSlide(); startAutoRotate(); });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => { nextSlide(); startAutoRotate(); });
      }
      
      if (wrapper) {
        wrapper.addEventListener('mouseenter', stopAutoRotate);
        wrapper.addEventListener('mouseleave', startAutoRotate);
      }
    }
  }

  async function loadComments() {
    try {
      const url = window.API?.comments || '/comments';
      const res  = await fetch(url);
      const data = await res.json();
      renderComments(data);
    } catch (err) {
      // Silent fail — comments are non-critical
    }
  }

  loadComments();

  /* ── Contact Form ─────────────────────────────────────────── */
  const commentForm = document.getElementById('commentForm');
  if (!commentForm) return;

  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd  = new FormData(commentForm);
    const btn = commentForm.querySelector('button[type="submit"]');
    const original = btn.innerText;

    try {
      btn.disabled  = true;
      btn.innerText = 'Sending...';

      const url = window.API?.submit || '/submit';
      const res  = await fetch(url, { method: 'POST', body: fd });
      const data = await res.json();

      if (data.success) {
        btn.innerText = 'Sent ✓';
        btn.style.background = '#1a1a1a';
        commentForm.reset();
        setTimeout(loadComments, 600);
        setTimeout(() => {
          btn.innerText = original;
          btn.style.background = '';
        }, 3000);
      } else {
        btn.innerText = 'Try again';
        setTimeout(() => { btn.innerText = original; }, 2500);
      }
    } catch {
      btn.innerText = 'Error — retry';
      setTimeout(() => { btn.innerText = original; }, 2500);
    } finally {
      btn.disabled = false;
    }
  });

  /* ── Hero Background Auto-Slider ──────────────────────────── */
  const heroBgElement = document.querySelector('.hero-mountain-image');
  if (heroBgElement) {
    const bgImages = [
      'mountain1.webp',
      'mountain2.webp',
      'mountain3.webp',
      'mountain4.webp',
      'mountain5.webp'
    ];
    let currentBgIndex = 0;
    
    // Find starting index from the element's style
    const currentStyle = heroBgElement.style.backgroundImage;
    const match = currentStyle.match(/mountain(\d+)\.webp/);
    if (match) {
      currentBgIndex = parseInt(match[1]) - 1;
    }

    setInterval(() => {
      heroBgElement.style.opacity = '0';
      setTimeout(() => {
        currentBgIndex = (currentBgIndex + 1) % bgImages.length;
        heroBgElement.style.backgroundImage = `url('/static/assets/images/${bgImages[currentBgIndex]}')`;
        heroBgElement.style.opacity = '1';
      }, 1000); // CSS transition is 1s
    }, 15000);
  }

  /* ── Footer Quick Links Smooth Scroll ─────────────────────── */
  const footerLinks = document.querySelectorAll('.footer-nav-link');
  footerLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const lenis = getLenis();
          if (lenis) {
            lenis.scrollTo(target, { offset: -100, duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
          } else {
            const y = target.getBoundingClientRect().top + window.pageYOffset - 100;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }
      }
    });
  });

  /* ── Hero CTA Buttons Smooth Scroll ───────────────────────── */
  const heroCtas = document.querySelectorAll('.btn-hero-primary, .btn-hero-secondary');
  heroCtas.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const lenis = getLenis();
          if (lenis) {
            lenis.scrollTo(target, { offset: -100, duration: 1.4, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
          } else {
            const y = target.getBoundingClientRect().top + window.pageYOffset - 100;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }
      }
    });
  });
});
