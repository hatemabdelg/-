(function () {
  "use strict";

  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Loader ---------- */
  const loader = document.getElementById("loader");
  const loaderBar = document.getElementById("loader-bar");
  const loaderPercent = document.getElementById("loader-percent");

  function runLoader() {
    document.body.classList.add("is-loading");
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 28 + 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        if (loaderBar) loaderBar.style.width = "100%";
        if (loaderPercent) loaderPercent.textContent = "100%";
        setTimeout(() => {
          if (loader) loader.classList.add("is-done");
          document.body.classList.remove("is-loading");
          initSite();
        }, 120);
      } else {
        if (loaderBar) loaderBar.style.width = progress + "%";
        if (loaderPercent) loaderPercent.textContent = Math.floor(progress) + "%";
      }
    }, 40);
  }

  /* ---------- Custom Cursor ---------- */
  function initCursor() {
    if (!isDesktop || prefersReduced) return;
    const cursor = document.getElementById("cursor");
    if (!cursor) return;
    document.body.classList.add("has-cursor");
    const dot = cursor.querySelector(".cursor-dot");
    const ring = cursor.querySelector(".cursor-ring");
    let mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      if (dot) { dot.style.left = mx + "px"; dot.style.top = my + "px"; }
    });
    function animateRing() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      if (ring) { ring.style.left = rx + "px"; ring.style.top = ry + "px"; }
      requestAnimationFrame(animateRing);
    }
    animateRing();
    document.querySelectorAll("a, button, .method-step, .exp-item, .contact-link").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });
  }

  /* ---------- 3D Background (lightweight) ---------- */
  function initBg3D() {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas || typeof THREE === "undefined" || prefersReduced) {
      if (canvas) canvas.style.display = "none";
      return;
    }

    const isMobile = window.innerWidth < 768 || isTouch;
    // Skip WebGL entirely on small phones for max performance
    if (window.innerWidth < 480) {
      canvas.style.display = "none";
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5));

    const particleCount = isMobile ? 36 : 70;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xc9a96e,
      size: 0.04,
      transparent: true,
      opacity: 0.28,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let mouseX = 0, mouseY = 0;
    let targetRotY = 0, targetRotX = 0;
    if (!isMobile) {
      document.addEventListener("mousemove", (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 0.25;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 0.18;
      }, { passive: true });
    }

    let frame = 0;
    let running = true;
    // Pause when tab hidden
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running) animate();
    });

    function animate() {
      if (!running) return;
      frame++;
      // Throttle: skip every other frame on mobile
      if (isMobile && frame % 2 === 1) {
        requestAnimationFrame(animate);
        return;
      }
      targetRotY = frame * 0.00025 + mouseX * 0.2;
      targetRotX = Math.sin(frame * 0.0002) * 0.05 + mouseY * 0.12;
      points.rotation.y += (targetRotY - points.rotation.y) * 0.05;
      points.rotation.x += (targetRotX - points.rotation.x) * 0.05;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth < 480) {
          canvas.style.display = "none";
          running = false;
          return;
        }
        canvas.style.display = "";
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }, 150);
    }, { passive: true });
  }

  function initScales() {}

  /* ---------- Lenis ---------- */
  let lenis = null;
  function initLenis() {
    if (prefersReduced || typeof Lenis === "undefined") return;
    // Disable smooth scroll on touch devices for better native feel & performance
    if (isTouch) return;
    lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ---------- Scroll Progress ---------- */
  function initScrollProgress() {
    const bar = document.getElementById("progress-bar");
    if (!bar) return;
    function update() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + "%";
    }
    if (lenis) lenis.on("scroll", update);
    else window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------- Nav ---------- */
  function initNav() {
    const nav = document.getElementById("nav");
    const toggle = document.getElementById("nav-toggle");
    const mobileMenu = document.getElementById("mobile-menu");
    const links = document.querySelectorAll(".nav-links a, .mobile-menu-links a, .nav-logo");

    function onScroll() {
      if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (toggle && mobileMenu) {
      toggle.addEventListener("click", () => {
        const isOpen = mobileMenu.classList.toggle("is-open");
        toggle.classList.toggle("is-open", isOpen);
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        mobileMenu.setAttribute("aria-hidden", isOpen ? "false" : "true");
        document.body.style.overflow = isOpen ? "hidden" : "";
      });
      mobileMenu.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", () => {
          mobileMenu.classList.remove("is-open");
          toggle.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          mobileMenu.setAttribute("aria-hidden", "true");
          document.body.style.overflow = "";
        });
      });
    }

    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");
        if (!href || !href.startsWith("#")) return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -20 });
        else target.scrollIntoView({ behavior: "smooth" });
      });
    });

    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-links a[data-section]");
    function updateActive() {
      let current = "";
      const scrollY = window.scrollY + 120;
      sections.forEach((sec) => {
        if (scrollY >= sec.offsetTop && scrollY < sec.offsetTop + sec.offsetHeight) current = sec.id;
      });
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("data-section") === current));
    }
    window.addEventListener("scroll", updateActive, { passive: true });
    updateActive();
  }

  /* ---------- Method steps ---------- */
  function initMethod() {
    const steps = document.querySelectorAll(".method-step");
    const progressBar = document.getElementById("method-progress-bar");
    if (!steps.length) return;
    function activate(index) {
      steps.forEach((s, i) => s.classList.toggle("is-active", i === index));
      if (progressBar) progressBar.style.width = ((index + 1) / steps.length) * 100 + "%";
    }
    steps.forEach((step, i) => {
      step.addEventListener("mouseenter", () => activate(i));
      step.addEventListener("focus", () => activate(i));
      step.addEventListener("click", () => activate(i));
    });
  }

  /* ---------- GSAP Animations (luxury text motion) ---------- */
  function initAnimations() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined" || prefersReduced) return;
    gsap.registerPlugin(ScrollTrigger);

    const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroTl
      .from(".hero-bg-img", { scale: 1.18, opacity: 0.6, duration: 1.6 }, 0)
      .from(".hero-meta", { opacity: 0, y: 16, duration: 0.75 }, 0.35)
      .from(".hero-name .name-line", { opacity: 0, y: 40, duration: 0.9, stagger: 0.12 }, 0.45)
      .from(".hero-title", { opacity: 0, y: 18, duration: 0.7 }, 0.7)
      .from(".hero-tagline", { opacity: 0, y: 16, duration: 0.7 }, 0.85)
      .from(".hero-actions .btn, .hero-actions .btn-whatsapp-label", { opacity: 0, y: 16, duration: 0.55, stagger: 0.08 }, 1.0)
      .from(".hero-scroll-hint", { opacity: 0, duration: 0.7 }, 1.2);

    /* 3D-ish parallax on hero background (desktop) */
    initHeroParallax();

    gsap.utils.toArray(".section-label, .section-title").forEach((el) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" },
        opacity: 0, y: 32, duration: 0.85, ease: "power3.out",
      });
    });

    /* Portrait pop + entrance */
    const portraitFrame = document.querySelector(".portrait-frame");
    gsap.from(".about-portrait-wrap", {
      scrollTrigger: {
        trigger: ".about-portrait-wrap",
        start: "top 85%",
        toggleActions: "play none none none",
        onEnter: () => {
          if (portraitFrame) {
            setTimeout(() => portraitFrame.classList.add("is-pop"), 400);
            setTimeout(() => portraitFrame.classList.remove("is-pop"), 1600);
          }
        },
      },
      opacity: 0,
      scale: 0.92,
      y: 30,
      duration: 1.05,
      ease: "power3.out",
    });
    /* Subtle recurring pop on hover (desktop) */
    if (portraitFrame && window.matchMedia("(hover: hover)").matches) {
      portraitFrame.addEventListener("mouseenter", () => portraitFrame.classList.add("is-pop"));
      portraitFrame.addEventListener("mouseleave", () => portraitFrame.classList.remove("is-pop"));
    }

    /* Cassation logo + quote */
    gsap.from(".cassation-logo-wrap", {
      scrollTrigger: { trigger: ".section-cassation", start: "top 85%", toggleActions: "play none none none" },
      opacity: 0, y: 24, duration: 0.9, ease: "power3.out",
    });
    gsap.utils.toArray(".about-lead, .about-text, .about-meta").forEach((el, i) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none" },
        opacity: 0, y: 24, duration: 0.75, delay: i * 0.06, ease: "power3.out",
      });
    });

    gsap.from(".method-step", {
      scrollTrigger: { trigger: "#method-stage", start: "top 80%", toggleActions: "play none none none" },
      opacity: 0, y: 40, duration: 0.7, stagger: 0.1, ease: "power3.out",
    });

    gsap.utils.toArray(".exp-item").forEach((item, i) => {
      gsap.from(item, {
        scrollTrigger: { trigger: item, start: "top 92%", toggleActions: "play none none none" },
        opacity: 0, y: 28, duration: 0.7, delay: i * 0.05, ease: "power3.out",
      });
    });

    gsap.utils.toArray(".path-item").forEach((item, i) => {
      gsap.from(item, {
        scrollTrigger: { trigger: item, start: "top 90%", toggleActions: "play none none none" },
        opacity: 0, x: 28, duration: 0.75, delay: i * 0.08, ease: "power3.out",
      });
    });

    const expValue = document.querySelector(".exp-value");
    if (expValue) {
      gsap.from(expValue, {
        scrollTrigger: { trigger: ".section-experience", start: "top 80%", toggleActions: "play none none none" },
        textContent: 0, duration: 1.6, ease: "power2.out", snap: { textContent: 1 },
        onUpdate: function () { expValue.textContent = Math.round(Number(this.targets()[0].textContent)); },
      });
    }

    gsap.from(".cassation-quote", {
      scrollTrigger: { trigger: ".section-cassation", start: "top 85%", toggleActions: "play none none none" },
      opacity: 0, y: 30, duration: 0.9, ease: "power3.out",
    });

    gsap.utils.toArray(".contact-link").forEach((link, i) => {
      gsap.from(link, {
        scrollTrigger: { trigger: link, start: "top 95%", toggleActions: "play none none none" },
        opacity: 0, y: 20, duration: 0.6, delay: i * 0.07, ease: "power3.out",
      });
    });
  }


  function initHeroParallax() {
    if (prefersReduced || isTouch || window.innerWidth < 900) return;
    const bg = document.querySelector(".hero-bg");
    const img = document.querySelector(".hero-bg-img");
    const hero = document.getElementById("hero");
    if (!bg || !img || !hero) return;

    let mx = 0, my = 0, cx = 0, cy = 0;
    let active = true;

    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }, { passive: true });
    hero.addEventListener("mouseleave", () => { mx = 0; my = 0; }, { passive: true });

    document.addEventListener("visibilitychange", () => { active = !document.hidden; if (active) tick(); });

    function tick() {
      if (!active) return;
      cx += (mx - cx) * 0.06;
      cy += (my - cy) * 0.06;
      const rx = cy * -4;
      const ry = cx * 5;
      bg.style.transform = "translate(" + (cx * -12) + "px," + (cy * -8) + "px) rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
      img.style.transform = "scale(1.08) translate(" + (cx * -6) + "px," + (cy * -4) + "px)";
      requestAnimationFrame(tick);
    }
    tick();
  }

  function initSite() {
    initCursor();
    initBg3D();
    initLenis();
    initScrollProgress();
    initNav();
    initMethod();
    initAnimations();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runLoader);
  } else {
    runLoader();
  }
})();
