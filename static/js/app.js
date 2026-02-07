// ===== Root Colors =====
(function () {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
})();

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

// ===== Theme Toggle Button =====
(function () {
  const root = document.documentElement;
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  function currentTheme() {
    return root.getAttribute("data-theme") || "dark";
  }
  function setIcon(theme) {
    btn.innerHTML =
      theme === "dark"
        ? '<i class="bi bi-sun"></i>'
        : '<i class="bi bi-moon-stars"></i>';
    btn.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
    );
    btn.title = btn.getAttribute("aria-label");
  }

  setIcon(currentTheme());
  btn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setIcon(next);
  });
})();

// ===== AOS Animation =====
AOS.init({ duration: 5000, once: false });

// ===== Back to Top Button =====
const backBtn = document.getElementById("backToTop");
window.onscroll = function () {
  backBtn.style.display =
    document.body.scrollTop > 200 || document.documentElement.scrollTop > 200
      ? "block"
      : "none";
};
backBtn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

var swiper = new Swiper(".mySwiper", {
    slidesPerView: 2,
    spaceBetween: 30,
    loop: true,

    speed: 7000,

    autoplay: {
        delay: 0,
        disableOnInteraction: false
    },

    freeMode: false,
    freeModeMomentum: false,

    pagination: {
        el: ".swiper-pagination",
        clickable: true,
    }
});

// ================== Comment Slider ==================
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("commentsContainer");
  const prevBtn = document.querySelector(".slider-prev");
  const nextBtn = document.querySelector(".slider-next");
  const dotsContainer = document.getElementById("sliderDots");

  let slides = [];
  let currentIndex = 0;
  let autoId = null;
  const AUTO_DELAY = 3000; // 3 seconds autoplay

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
        })[m],
    );
  }

  function updateSlides() {
    if (!slides.length) return;

    slides.forEach((slide, i) => {
      slide.classList.remove("active", "prev", "next");
      if (i === currentIndex) {
        slide.classList.add("active");
      } else if (i === (currentIndex - 1 + slides.length) % slides.length) {
        slide.classList.add("prev");
      } else if (i === (currentIndex + 1) % slides.length) {
        slide.classList.add("next");
      }
    });

    // Update dots
    const dots = dotsContainer.querySelectorAll(".slider-dot");
    dots.forEach((dot, i) =>
      dot.classList.toggle("active", i === currentIndex),
    );
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
    if (autoId) {
      clearInterval(autoId);
      autoId = null;
    }
  }

  function resetAuto() {
    stopAuto();
    startAuto();
  }

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

      // use button instead of div for dots
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
      const res = await fetch("/comments");
      const data = await res.json();
      renderComments(data);
    } catch (err) {
      console.error("Failed to load comments", err);
    }
  };

  prevBtn.addEventListener("click", () => {
    if (slides.length <= 1) return;
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    updateSlides();
    resetAuto();
  });

  nextBtn.addEventListener("click", () => {
    if (slides.length <= 1) return;
    currentIndex = (currentIndex + 1) % slides.length;
    updateSlides();
    resetAuto();
  });

  const sliderWrapper = document.querySelector(".slider-container");
  if (sliderWrapper) {
    sliderWrapper.addEventListener("mouseenter", stopAuto);
    sliderWrapper.addEventListener("mouseleave", startAuto);
  }

  loadComments();
});

// ================== Comment Form ==================
document.addEventListener("DOMContentLoaded", () => {
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
      const res = await fetch("/submit", { method: "POST", body: fd });
      const result = await res.json();
      if (result.success) {
        alert("✅ Message has been sent!");
        commentForm.reset();
        setTimeout(() => {
          if (typeof loadComments === "function") loadComments(); // refresh comments if available
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

// ===== Accurate Active Navbar Link on Scroll =====
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
