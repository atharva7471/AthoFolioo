// ===== Typing Animation =====
var typed = new Typed(".text", {
  strings: [
    "Machine Learning Enthusiast.",
    "Web Developer.",
    "Python Programmer.",
    "Problem Solver.",
  ],
  typeSpeed: 100,
  backSpeed: 100,
  backDelay: 1000,
  loop: true,
});

// ===== Navbar Scroll Effect =====
window.addEventListener("scroll", () => {
  document
    .querySelector("header")
    .classList.toggle("scrolled", window.scrollY > 10);
});

// ===== Navbar Toggle =====
const menuToggle = document.getElementById("menuToggle");
const navMenu = document.querySelector(".nav-item ul");
const toggleIcon = menuToggle.querySelector("i");

menuToggle.addEventListener("click", () => {
  navMenu.classList.toggle("active");
  toggleIcon.classList.toggle("bi-list");
  toggleIcon.classList.toggle("bi-x");
});

// ===== Scroll Progress =====
const progressBar = document.getElementById("scrollProgress");
window.addEventListener("scroll", () => {
  const scrollTop =
    document.documentElement.scrollTop || document.body.scrollTop;
  const scrollHeight =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;
  const scrolled = (scrollTop / scrollHeight) * 100;
  progressBar.style.width = scrolled + "%";
});

// ===== Custom Scroll-Reveal =====
(function () {
  // Dynamically add reveal classes to key sections
  const revealMap = [
    { sel: '.certificates',            cls: 'reveal reveal-up'     },
    { sel: '.projects .section-title', cls: 'reveal reveal-down'   },
    { sel: '.project-grid',            cls: 'reveal-stagger'       },
    { sel: '.contact .section-title',  cls: 'reveal reveal-up'     },
    { sel: '.contact-intro',           cls: 'reveal reveal-up'     },
    { sel: '.contact-form',            cls: 'reveal reveal-up'     },
    { sel: '.education',               cls: 'reveal reveal-up'     },
    { sel: '.edu-timeline',            cls: 'reveal-stagger'       },
    { sel: '.footer-inner',            cls: 'reveal reveal-up'     },
    { sel: '.cert-track-wrapper',      cls: 'reveal reveal-up'     },
  ];

  revealMap.forEach(({ sel, cls }) => {
    document.querySelectorAll(sel).forEach(el => {
      cls.split(' ').forEach(c => el.classList.add(c));
    });
  });

  // Observe all .reveal and .reveal-stagger elements
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
    observer.observe(el);
  });
})();


// ===== Project Card Modal =====
(function () {
  const modal    = document.getElementById("projectModal");
  if (!modal) return;

  const backdrop = modal.querySelector(".proj-modal-backdrop");
  const closeBtn = modal.querySelector(".proj-modal-close");
  const modalImg   = document.getElementById("modalImg");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc  = document.getElementById("modalDesc");
  const modalTech  = document.getElementById("modalTech");
  const modalLinks = document.getElementById("modalLinks");

  function openModal(card) {
    const { title, desc, img, live, github, tech } = card.dataset;
    modalImg.src = img;
    modalImg.alt = title;
    modalTitle.textContent = title;
    modalDesc.textContent  = desc;

    modalTech.innerHTML = (tech || "").split(",").filter(Boolean)
      .map(t => `<span>${t.trim()}</span>`).join("");

    modalLinks.innerHTML = "";
    if (live)   modalLinks.innerHTML += `<a href="${live}" target="_blank" rel="noopener noreferrer" class="modal-live"><i class="bi bi-box-arrow-up-right"></i> Live Demo</a>`;
    if (github) modalLinks.innerHTML += `<a href="${github}" target="_blank" rel="noopener noreferrer" class="modal-gh"><i class="bi bi-github"></i> View Code</a>`;

    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".project-card");
    if (card) { openModal(card); return; }
  });

  backdrop.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
})();

// ===== Back to Top Button + Progress Ring =====
const backBtn   = document.getElementById("backToTop");
const bttCircle = document.getElementById("bttCircle");
const CIRCUMFERENCE = 119.4; // 2π × r=19

window.addEventListener("scroll", () => {
  const scrollTop    = document.documentElement.scrollTop || document.body.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const pct = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

  scrollTop > 200
    ? backBtn.classList.add("visible")
    : backBtn.classList.remove("visible");

  if (bttCircle) {
    bttCircle.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
  }
});

backBtn.addEventListener("click", () =>
  window.scrollTo({ top: 0, behavior: "smooth" })
);


// ===== Hero Interactive Particle Constellation =====
(function () {
  const canvas    = document.getElementById("heroCanvas");
  const spotlight = document.getElementById("heroSpotlight");
  const heroEl    = document.querySelector(".hero");
  const blobEl    = document.querySelector(".image-wrapper .blob");
  if (!canvas || !heroEl) return;

  const ctx = canvas.getContext("2d");
  let W, H;
  const PARTICLE_COUNT = 70;
  const CONNECT_DIST   = 130;
  const REPULSE_DIST   = 110;
  let mouse = { x: null, y: null, active: false };
  let particles = [];
  let rafId;

  // ── Resize ────────────────────────────────────────
  function resize() {
    const r = heroEl.getBoundingClientRect();
    W = canvas.width  = r.width;
    H = canvas.height = r.height;
  }

  // ── Particle ──────────────────────────────────────
  class Particle {
    constructor() { this.spawn(); }
    spawn() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.55;
      this.vy = (Math.random() - 0.5) * 0.55;
      this.r  = Math.random() * 1.8 + 0.8;
      this.hue = Math.random() > 0.5 ? 200 : 270; // cyan or purple
    }
    update() {
      if (mouse.active) {
        const dx   = this.x - mouse.x;
        const dy   = this.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < REPULSE_DIST && dist > 0) {
          const force = ((REPULSE_DIST - dist) / REPULSE_DIST) * 0.25;
          this.vx += (dx / dist) * force;
          this.vy += (dy / dist) * force;
        }
      }
      this.vx *= 0.97;
      this.vy *= 0.97;
      this.x  += this.vx;
      this.y  += this.vy;
      if (this.x < 0)  this.x = W;
      if (this.x > W)  this.x = 0;
      if (this.y < 0)  this.y = H;
      if (this.y > H)  this.y = 0;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 90%, 70%, 0.75)`;
      ctx.fill();
    }
  }

  // ── Draw frame ───────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // particle → particle lines
      for (let j = i + 1; j < particles.length; j++) {
        const q    = particles[j];
        const dist = Math.hypot(p.x - q.x, p.y - q.y);
        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.35;
          ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
          ctx.lineWidth   = 0.7;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }

      // particle → cursor lines (golden)
      if (mouse.active) {
        const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (dist < CONNECT_DIST * 1.6) {
          const alpha = (1 - dist / (CONNECT_DIST * 1.6)) * 0.55;
          ctx.strokeStyle = `rgba(250,204,21,${alpha})`;
          ctx.lineWidth   = 0.9;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      p.update();
      p.draw();
    }

    // Cursor node
    if (mouse.active) {
      // inner dot
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(250,204,21,0.9)";
      ctx.fill();
      // outer ring
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 18, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(250,204,21,0.25)";
      ctx.lineWidth   = 1.2;
      ctx.stroke();
    }

    rafId = requestAnimationFrame(draw);
  }

  // ── Init ─────────────────────────────────────────
  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
    cancelAnimationFrame(rafId);
    draw();
  }

  window.addEventListener("resize", init);

  // ── Mouse via WINDOW (no navbar interruption) ────────
  window.addEventListener("mousemove", (e) => {
    const rect = heroEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if truly within hero bounds
    const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

    if (inside) {
      mouse.x = x;
      mouse.y = y;
      mouse.active = true;

      if (spotlight) {
        spotlight.style.left = x + "px";
        spotlight.style.top  = y + "px";
        spotlight.classList.add("active");
      }
      if (blobEl) {
        const dx = ((x - W / 2) / W) * 30;
        const dy = ((y - H / 2) / H) * 30;
        blobEl.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    } else {
      mouse.active = false;
      if (spotlight) spotlight.classList.remove("active");
      if (blobEl)    blobEl.style.transform = "";
    }
  });

  init();
})();

// ===== Flip Cards — Click to Flip =====
document.querySelectorAll(".flip-card").forEach((card) => {
  card.addEventListener("click", (e) => {
    // Don't flip if clicking a link inside the back face
    if (e.target.closest("a")) return;
    card.classList.toggle("flipped");
  });
});

// Click outside any flipped card to unflip it
document.addEventListener("click", (e) => {
  if (!e.target.closest(".flip-card")) {
    document.querySelectorAll(".flip-card.flipped").forEach((c) =>
      c.classList.remove("flipped")
    );
  }
});




// ===== Swiper Carousel — Drag Only =====
var swiper = new Swiper(".certSwiper", {
  slidesPerView: "auto",
  spaceBetween: 24,
  loop: true,
  speed: 600,
  grabCursor: true,
  allowTouchMove: true,
});



// ===== Active Navbar Link on Scroll =====
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".nav-item ul li");

function setActiveNav() {
  const scrollPos = window.scrollY + window.innerHeight / 2;

  sections.forEach((section) => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute("id");

    if (scrollPos >= top && scrollPos < top + height) {
      navLinks.forEach((li) => {
        li.classList.remove("active");
        const link = li.querySelector("a");
        if (link && link.getAttribute("href") === `#${id}`) {
          li.classList.add("active");
        }
      });
    }
  });
}

window.addEventListener("scroll", setActiveNav);
window.addEventListener("load", setActiveNav);

// ===== Single DOMContentLoaded (Comment Slider + Form) =====
document.addEventListener("DOMContentLoaded", () => {
  // -------- Comment Slider --------
  const container = document.getElementById("commentsContainer");
  const prevBtn = document.querySelector(".slider-prev");
  const nextBtn = document.querySelector(".slider-next");
  const dotsContainer = document.getElementById("sliderDots");

  let slides = [];
  let currentIndex = 0;
  let autoId = null;
  const AUTO_DELAY = 3000;

  function escapeHtml(text) {
    if (!text) return "";
    return text.replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m]
    );
  }

  function updateSlides() {
    if (!slides.length) return;
    slides.forEach((slide, i) => {
      slide.classList.remove("active", "prev", "next");
      if (i === currentIndex) slide.classList.add("active");
      else if (i === (currentIndex - 1 + slides.length) % slides.length)
        slide.classList.add("prev");
      else if (i === (currentIndex + 1) % slides.length)
        slide.classList.add("next");
    });
    const dots = dotsContainer.querySelectorAll(".slider-dot");
    dots.forEach((dot, i) => dot.classList.toggle("active", i === currentIndex));
  }

  function startAuto() {
    stopAuto();
    if (slides.length <= 1) return;
    autoId = setInterval(() => {
      currentIndex = (currentIndex + 1) % slides.length;
      updateSlides();
    }, AUTO_DELAY);
  }

  function stopAuto() {
    if (autoId) { clearInterval(autoId); autoId = null; }
  }

  function resetAuto() { stopAuto(); startAuto(); }

  function renderComments(comments) {
    container.innerHTML = "";
    dotsContainer.innerHTML = "";

    if (!comments || comments.length === 0) {
      container.innerHTML = `
        <div class="testimonial-slide active">
          <div class="comment-card">
            <div class="comment-name">No comments yet</div>
            <div class="comment-message">Be the first to leave a comment!</div>
          </div>
        </div>`;
      slides = Array.from(container.querySelectorAll(".testimonial-slide"));
      currentIndex = 0;
      return;
    }

    comments.forEach((c, i) => {
      const slide = document.createElement("div");
      slide.className = "testimonial-slide";
      if (i === 0) slide.classList.add("active");
      slide.innerHTML = `
        <div class="comment-card">
          <div class="comment-name">${escapeHtml(c.name)}</div>
          <div class="comment-message">${escapeHtml(c.message)}</div>
        </div>`;
      container.appendChild(slide);

      const dot = document.createElement("button");
      dot.className = "slider-dot" + (i === 0 ? " active" : "");
      dot.addEventListener("click", () => {
        currentIndex = i;
        updateSlides();
        resetAuto();
      });
      dotsContainer.appendChild(dot);
    });

    slides = Array.from(container.querySelectorAll(".testimonial-slide"));
    currentIndex = 0;
    updateSlides();
    startAuto();
  }

  window.loadComments = async function () {
    try {
      const url = (window.API && window.API.comments) ? window.API.comments : "/comments";
      const res = await fetch(url);
      const data = await res.json();
      renderComments(data);
    } catch (err) {
      console.error("Failed to load comments", err);
    }
  };

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (slides.length <= 1) return;
      currentIndex = (currentIndex - 1 + slides.length) % slides.length;
      updateSlides();
      resetAuto();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (slides.length <= 1) return;
      currentIndex = (currentIndex + 1) % slides.length;
      updateSlides();
      resetAuto();
    });
  }

  const sliderWrapper = document.querySelector(".slider-container");
  if (sliderWrapper) {
    sliderWrapper.addEventListener("mouseenter", stopAuto);
    sliderWrapper.addEventListener("mouseleave", startAuto);
  }

  loadComments();

  // -------- Comment Form --------
  const commentForm = document.getElementById("commentForm");
  if (!commentForm) return;

  commentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(commentForm);
    const name = (fd.get("name") || "").trim();
    const email = (fd.get("email") || "").trim();
    const message = (fd.get("message") || "").trim();
    const btn = commentForm.querySelector("button[type='submit']");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || name.length < 2)
      return alert("❌ Please enter your full name!");
    if (!emailPattern.test(email))
      return alert("❌ Please enter a valid email!");
    if (!message || message.length < 5)
      return alert("❌ Please enter a longer message!");

    try {
      btn.disabled = true;
      btn.innerText = "Sending...";
      const submitUrl = (window.API && window.API.submit) ? window.API.submit : "/submit";
      const res = await fetch(submitUrl, { method: "POST", body: fd });
      const result = await res.json();
      if (result.success) {
        alert("✅ Message has been sent!");
        commentForm.reset();
        setTimeout(() => {
          if (typeof loadComments === "function") loadComments();
        }, 600);
      } else {
        alert("❌ " + (result.message || "Failed to submit."));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Something went wrong.");
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerText = "Send Message";
      }, 1000);
    }
  });
});


// ===== Tech Arsenal — Tabs =====
(function () {
  const tabs   = document.querySelectorAll(".arsenal-tab");
  const panels = document.querySelectorAll(".arsenal-panel");

  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.cat;

      // Update tab active state
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Show matching panel and replay card entrance animations
      panels.forEach((panel) => {
        panel.classList.remove("active");
      });

      const activePanel = document.getElementById("panel-" + target);
      if (!activePanel) return;

      // Re-trigger staggered card animations by resetting animation
      const cards = activePanel.querySelectorAll(".skill-card");
      cards.forEach((card) => {
        card.style.animation = "none";
        card.offsetHeight; // reflow
        card.style.animation = "";
      });

      activePanel.classList.add("active");
    });
  });
})();


// ===== Tech Arsenal — Floating Dot Particles =====
(function () {
  const canvas  = document.getElementById("arsenalCanvas");
  const section = document.querySelector(".arsenal");
  if (!canvas || !section) return;

  const ctx = canvas.getContext("2d");
  let W, H, rafId;

  const DOTS = 55;
  let dots = [];

  function resize() {
    const r = section.getBoundingClientRect();
    W = canvas.width  = r.width;
    H = canvas.height = section.offsetHeight;
  }

  function randBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  class Dot {
    constructor() { this.reset(); }
    reset() {
      this.x    = Math.random() * W;
      this.y    = Math.random() * H;
      this.r    = randBetween(1, 3.5);
      this.vx   = randBetween(-0.35, 0.35);
      this.vy   = randBetween(-0.35, 0.35);
      this.alpha = randBetween(0.3, 0.8);
      // Vary hue so we get teal, cyan, and amber dots
      const pallete = [200, 215, 190, 45];
      this.hue  = pallete[Math.floor(Math.random() * pallete.length)];
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < -10)  this.x = W + 10;
      if (this.x > W + 10) this.x = -10;
      if (this.y < -10)  this.y = H + 10;
      if (this.y > H + 10) this.y = -10;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 85%, 65%, ${this.alpha})`;
      ctx.fill();
    }
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    dots.forEach((d) => { d.update(); d.draw(); });
    rafId = requestAnimationFrame(frame);
  }

  function init() {
    resize();
    cancelAnimationFrame(rafId);
    dots = Array.from({ length: DOTS }, () => new Dot());
    frame();
  }

  window.addEventListener("resize", init);
  init();
})();

