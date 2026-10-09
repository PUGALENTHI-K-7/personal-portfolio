(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const menuButton = document.getElementById("mobile-menu-button");
    const mobileMenu = document.getElementById("mobile-menu");

    if (menuButton && mobileMenu) {
      menuButton.addEventListener("click", function () {
        const isOpen = mobileMenu.classList.toggle("open");
        menuButton.setAttribute("aria-expanded", String(isOpen));
        menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
        menuButton.textContent = isOpen ? "×" : "☰";
      });
      mobileMenu.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          mobileMenu.classList.remove("open");
          menuButton.setAttribute("aria-expanded", "false");
          menuButton.setAttribute("aria-label", "Open navigation");
          menuButton.textContent = "☰";
        });
      });
    }

    const year = document.getElementById("footer-year");
    if (year) year.textContent = String(new Date().getFullYear());

    function updateIndiaClock() {
      const clock = document.getElementById("india-clock");
      if (!clock) return;
      try {
        const formatted = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        }).format(new Date());
        clock.textContent = formatted + " IST · Vellore";
      } catch (_error) {
        clock.textContent = "IST · Vellore";
      }
    }
    updateIndiaClock();
    window.setInterval(updateIndiaClock, 1000);

    document.querySelectorAll("[data-copy-email]").forEach(function (button) {
      button.addEventListener("click", async function () {
        const email = button.getAttribute("data-copy-email");
        const feedback = document.getElementById("copy-feedback");
        try {
          await navigator.clipboard.writeText(email);
          if (feedback) feedback.textContent = "Email copied to clipboard.";
        } catch (_error) {
          if (feedback) feedback.textContent = "Email: " + email;
        }
      });
    });

    setupInteractiveGrids();
    setupFieldNoteCard();
    setupActiveSectionLinks();
  });

  function setupInteractiveGrids() {
    document.querySelectorAll("[data-grid]").forEach(function (surface) {
      const canvas = surface.querySelector(".grid-canvas");
      if (!canvas || !canvas.getContext) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const state = {
        width: 0, height: 0, dpr: 1,
        pointerX: -1000, pointerY: -1000,
        currentX: -1000, currentY: -1000,
        active: false, frame: 0
      };
      const spacing = 54;

      function resize() {
        const rect = surface.getBoundingClientRect();
        state.width = Math.max(1, rect.width);
        state.height = Math.max(1, rect.height);
        state.dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(state.width * state.dpr);
        canvas.height = Math.round(state.height * state.dpr);
        canvas.style.width = state.width + "px";
        canvas.style.height = state.height + "px";
        draw();
      }

      function gaussian(x, y, px, py, radius) {
        const dx = x - px;
        const dy = y - py;
        return Math.exp(-((dx * dx) + (dy * dy)) / (2 * radius * radius));
      }

      function draw() {
        const width = state.width;
        const height = state.height;
        if (!width || !height) return;
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const hasPointer = state.active;
        const px = state.currentX;
        const py = state.currentY;
        const radius = Math.min(190, Math.max(125, width * 0.18));

        /* Keep the architectural grid straight, like the reference screenshot. */
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.075)";
        for (let x = 0; x <= width + spacing; x += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y <= height + spacing; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        /* Small intersection points add depth without distorting the grid. */
        for (let x = 0; x <= width + spacing; x += spacing) {
          for (let y = 0; y <= height + spacing; y += spacing) {
            const influence = hasPointer ? gaussian(x, y, px, py, radius * 0.8) : 0;
            const dotRadius = 1 + influence * 1.2;
            const sparseGoldDot = (Math.round(x / spacing) + Math.round(y / spacing)) % 4 === 0;
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fillStyle = hasPointer && influence > 0.1
              ? "rgba(232,202,93," + (0.24 + influence * 0.58) + ")"
              : (sparseGoldDot ? "rgba(232,202,93,0.20)" : "rgba(255,255,255,0.13)");
            ctx.fill();
          }
        }
        if (hasPointer) {
          const glow = ctx.createRadialGradient(px, py, 0, px, py, radius * 1.15);
          glow.addColorStop(0, "rgba(245,233,160,0.10)");
          glow.addColorStop(.45, "rgba(245,233,160,0.035)");
          glow.addColorStop(1, "rgba(245,233,160,0)");
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, width, height);
        }
      }

      function animateToPointer() {
        if (state.frame) cancelAnimationFrame(state.frame);
        const tick = function () {
          const dx = state.pointerX - state.currentX;
          const dy = state.pointerY - state.currentY;
          state.currentX += dx * 0.16;
          state.currentY += dy * 0.16;
          draw();
          if (Math.abs(dx) > .25 || Math.abs(dy) > .25) {
            state.frame = requestAnimationFrame(tick);
          } else {
            state.currentX = state.pointerX;
            state.currentY = state.pointerY;
            state.frame = 0;
            draw();
          }
        };
        state.frame = requestAnimationFrame(tick);
      }

      surface.addEventListener("pointermove", function (event) {
        if (event.pointerType === "touch") return;
        const rect = surface.getBoundingClientRect();
        state.pointerX = event.clientX - rect.left;
        state.pointerY = event.clientY - rect.top;
        if (!state.active) {
          state.currentX = state.pointerX;
          state.currentY = state.pointerY;
        }
        state.active = true;
        surface.style.setProperty("--glow-x", ((state.pointerX / rect.width) * 100) + "%");
        surface.style.setProperty("--glow-y", ((state.pointerY / rect.height) * 100) + "%");
        animateToPointer();
      });
      surface.addEventListener("pointerleave", function () {
        state.active = false;
        state.pointerX = -1000;
        state.pointerY = -1000;
        if (state.frame) cancelAnimationFrame(state.frame);
        state.frame = 0;
        draw();
        surface.style.setProperty("--glow-x", "50%");
        surface.style.setProperty("--glow-y", "45%");
      });

      if ("ResizeObserver" in window) {
        const observer = new ResizeObserver(resize);
        observer.observe(surface);
      } else {
        window.addEventListener("resize", resize, { passive: true });
      }
      resize();
    });
  }


  function setupFieldNoteCard() {
    const wrap = document.querySelector(".field-note-wrap");
    const card = document.querySelector("[data-field-card]");
    const status = document.getElementById("field-note-status");
    if (!wrap || !card) return;

    const defaultStatus = "MOVE YOUR CURSOR TO EXPLORE ↗";
    const topics = Array.from(card.querySelectorAll("[data-note]"));

    function resetCard() {
      card.style.setProperty("--note-rotate-x", "0deg");
      card.style.setProperty("--note-rotate-y", "0deg");
      wrap.classList.remove("is-exploring");
      topics.forEach(function (topic) { topic.classList.remove("is-active"); });
      if (status) status.textContent = defaultStatus;
    }

    card.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty("--note-rotate-y", ((x - .5) * 5).toFixed(2) + "deg");
      card.style.setProperty("--note-rotate-x", ((.5 - y) * 4).toFixed(2) + "deg");
    });
    card.addEventListener("pointerleave", resetCard);

    topics.forEach(function (topic) {
      function activateTopic() {
        topics.forEach(function (item) { item.classList.toggle("is-active", item === topic); });
        wrap.classList.add("is-exploring");
        if (status) status.textContent = topic.getAttribute("data-note");
      }
      topic.addEventListener("pointerenter", activateTopic);
      topic.addEventListener("focus", activateTopic);
      topic.addEventListener("blur", function () {
        topic.classList.remove("is-active");
        if (!card.matches(":hover") && status) {
          wrap.classList.remove("is-exploring");
          status.textContent = defaultStatus;
        }
      });
    });
  }

  function setupActiveSectionLinks() {
    const sections = Array.from(document.querySelectorAll("main section[id]"));
    const navLinks = Array.from(document.querySelectorAll(".sidebar-link[href^='#']"));
    if (!sections.length || !navLinks.length || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-24% 0px -62% 0px", threshold: 0 });
    sections.forEach(function (section) { observer.observe(section); });
  }
})();
