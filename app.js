/* ============================================================
   THE LEGAL MIND — Application Logic
   حاتم عبدالجليل — محامي حر
   ============================================================ */

(function () {
  'use strict';

  // ---------- Globals ----------
  let lenis;
  let scene, camera, renderer, sculpture;
  let mouse = { x: 0, y: 0 };
  let targetMouse = { x: 0, y: 0 };
  let scrollProgress = 0;
  let isLoaded = false;

  // ---------- DOM ----------
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderPercent = document.getElementById('loader-percent');
  const cursor = document.getElementById('cursor');
  const cursorDot = cursor.querySelector('.cursor-dot');
  const cursorRing = cursor.querySelector('.cursor-ring');
  const cursorLabel = cursor.querySelector('.cursor-label');
  const progressBar = document.getElementById('progress-bar');
  const nav = document.getElementById('nav');
  const yearEl = document.getElementById('year');

  // ---------- Year ----------
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ============================================================
  // LOADER
  // ============================================================
  function initLoader() {
    document.body.classList.add('loading');

    const nameEl = document.querySelector('.loader-name');
    const title = document.querySelector('.loader-title');

    // Different reveal for loader: soft scale + blur dissolve (not letter-by-letter)
    gsap.to(nameEl, {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      duration: 1.1,
      ease: 'power3.out',
      delay: 0.15
    });

    gsap.to(title, {
      opacity: 1,
      duration: 0.6,
      delay: 0.7
    });

    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 18 + 6;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        finishLoader();
      }
      loaderBar.style.width = progress + '%';
      loaderPercent.textContent = Math.floor(progress) + '%';
    }, 120);
  }

  function finishLoader() {
    setTimeout(() => {
      gsap.to(loader, {
        opacity: 0,
        duration: 0.9,
        ease: 'power2.inOut',
        onComplete: () => {
          loader.classList.add('hidden');
          document.body.classList.remove('loading');
          isLoaded = true;
          startHeroAnimation();
        }
      });
    }, 400);
  }

  // ============================================================
  // CUSTOM CURSOR
  // ============================================================
  function initCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) {
      cursor.style.display = 'none';
      document.body.style.cursor = 'auto';
      return;
    }

    let cursorX = 0, cursorY = 0;
    let ringX = 0, ringY = 0;

    document.addEventListener('mousemove', (e) => {
      cursorX = e.clientX;
      cursorY = e.clientY;
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Lerp loop
    function updateCursor() {
      // Dot follows instantly
      cursorDot.style.left = cursorX + 'px';
      cursorDot.style.top = cursorY + 'px';

      // Ring lags
      ringX += (cursorX - ringX) * 0.15;
      ringY += (cursorY - ringY) * 0.15;
      cursorRing.style.left = ringX + 'px';
      cursorRing.style.top = ringY + 'px';

      // Label follows ring
      cursorLabel.style.left = ringX + 'px';
      cursorLabel.style.top = ringY + 'px';

      requestAnimationFrame(updateCursor);
    }
    updateCursor();

    // Hover states
    document.querySelectorAll('[data-cursor], a, button').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.classList.add('is-hover');
        const label = el.getAttribute('data-cursor');
        if (label) {
          cursorLabel.textContent = label;
        }
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-hover', 'is-magnetic', 'is-3d');
        cursorLabel.textContent = '';
      });
    });
  }

  // ============================================================
  // LENIS + GSAP
  // ============================================================
  function initSmoothScroll() {
    const isTouch = window.matchMedia('(pointer: coarse)').matches ||
                    window.matchMedia('(max-width: 900px)').matches;

    lenis = new Lenis({
      duration: isTouch ? 0.9 : 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      // On mobile: lighter smoothing so it feels closer to native
      smoothTouch: isTouch ? true : false,
      touchMultiplier: isTouch ? 1.35 : 1.6,
      wheelMultiplier: isTouch ? 0.9 : 1,
      infinite: false,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // Progress bar + nav state
    lenis.on('scroll', ({ progress }) => {
      scrollProgress = progress;
      if (progressBar) progressBar.style.height = (progress * 100) + '%';

      if (progress > 0.02) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });
  }

  // ============================================================
  // THREE.JS — Abstract Legal Sculpture
  // ============================================================
  function initThree() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const isMobile = window.matchMedia('(max-width: 900px)').matches ||
                     window.matchMedia('(pointer: coarse)').matches;

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.3, isMobile ? 6.2 : 5.5);

    // Renderer — lighter on mobile for smoother FPS
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: true,
      powerPreference: isMobile ? 'low-power' : 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    if (renderer.outputEncoding !== undefined) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }

    // Lights — brighter for visibility against dark background
    const ambient = new THREE.AmbientLight(0x606060, 0.65);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.6);
    keyLight.position.set(4, 5, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe8d5a8, 0.9);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xd4c4a0, 0.55, 25);
    fillLight.position.set(0, -1, 4);
    scene.add(fillLight);

    const topLight = new THREE.PointLight(0xffffff, 0.4, 15);
    topLight.position.set(0, 5, 2);
    scene.add(topLight);

    // ---- Create Abstract Legal Sculpture ----
    sculpture = new THREE.Group();

    // Materials — brighter dark chrome + clear gold so visible on black
    const metalMat = new THREE.MeshPhysicalMaterial({
      color: 0x3a3a3a,
      metalness: 0.92,
      roughness: 0.22,
      clearcoat: 0.7,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.4,
    });

    const brightMetalMat = new THREE.MeshPhysicalMaterial({
      color: 0x6a6a6a,
      metalness: 0.95,
      roughness: 0.15,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.6,
    });

    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4c4a0,
      metalness: 1,
      roughness: 0.1,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.8,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x222222,
      metalness: 0.15,
      roughness: 0.05,
      transmission: 0.55,
      thickness: 0.4,
      transparent: true,
      opacity: 0.75,
      envMapIntensity: 1.4,
    });

    // Central vertical core (column of justice) — brighter
    const coreGeo = new THREE.CylinderGeometry(0.13, 0.2, 2.5, 48);
    const core = new THREE.Mesh(coreGeo, brightMetalMat);
    core.position.y = 0;
    sculpture.add(core);

    // Gold accent rings on core
    for (let i = 0; i < 3; i++) {
      const accentGeo = new THREE.TorusGeometry(0.14 + i * 0.02, 0.012, 12, 48);
      const accent = new THREE.Mesh(accentGeo, goldMat);
      accent.position.y = -0.6 + i * 0.6;
      accent.rotation.x = Math.PI / 2;
      sculpture.add(accent);
    }

    // Top capital / balance point — gold
    const capitalGeo = new THREE.CylinderGeometry(0.32, 0.14, 0.2, 32);
    const capital = new THREE.Mesh(capitalGeo, goldMat);
    capital.position.y = 1.3;
    sculpture.add(capital);

    // Balance beam — bright metal with gold tips
    const beamGeo = new THREE.BoxGeometry(2.4, 0.07, 0.14);
    const beam = new THREE.Mesh(beamGeo, brightMetalMat);
    beam.position.y = 1.42;
    sculpture.add(beam);

    // Beam gold tips
    const tipGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const tipL = new THREE.Mesh(tipGeo, goldMat);
    tipL.position.set(-1.2, 1.42, 0);
    sculpture.add(tipL);
    const tipR = new THREE.Mesh(tipGeo, goldMat);
    tipR.position.set(1.2, 1.42, 0);
    sculpture.add(tipR);

    // Scale pans — brighter
    const panGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.045, 32);
    const panL = new THREE.Mesh(panGeo, brightMetalMat);
    panL.position.set(-1.0, 0.98, 0);
    sculpture.add(panL);
    const panR = new THREE.Mesh(panGeo, brightMetalMat);
    panR.position.set(1.0, 0.98, 0);
    sculpture.add(panR);

    // Gold rim on pans
    const panRimGeo = new THREE.TorusGeometry(0.35, 0.015, 10, 48);
    const panRimL = new THREE.Mesh(panRimGeo, goldMat);
    panRimL.position.set(-1.0, 1.0, 0);
    panRimL.rotation.x = Math.PI / 2;
    sculpture.add(panRimL);
    const panRimR = new THREE.Mesh(panRimGeo, goldMat);
    panRimR.position.set(1.0, 1.0, 0);
    panRimR.rotation.x = Math.PI / 2;
    sculpture.add(panRimR);

    // Chains — gold
    const chainGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8);
    const chainL = new THREE.Mesh(chainGeo, goldMat);
    chainL.position.set(-1.0, 1.2, 0);
    sculpture.add(chainL);
    const chainR = new THREE.Mesh(chainGeo, goldMat);
    chainR.position.set(1.0, 1.2, 0);
    sculpture.add(chainR);

    // Geometric fragments (chaos elements) — fewer on mobile
    const fragCount = isMobile ? 5 : 10;
    const fragGeo = new THREE.OctahedronGeometry(0.1, 0);
    for (let i = 0; i < fragCount; i++) {
      const frag = new THREE.Mesh(fragGeo, i % 2 === 0 ? goldMat : brightMetalMat);
      const angle = (i / fragCount) * Math.PI * 2;
      const radius = 1.2 + Math.random() * 0.5;
      frag.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 1.6,
        Math.sin(angle) * radius * 0.55
      );
      frag.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      frag.userData = { baseY: frag.position.y, speed: 0.25 + Math.random() * 0.3, angle, type: 'frag' };
      sculpture.add(frag);
    }

    // Base platform
    const baseGeo = new THREE.CylinderGeometry(0.6, 0.7, 0.14, isMobile ? 24 : 48);
    const base = new THREE.Mesh(baseGeo, metalMat);
    base.position.y = -1.35;
    sculpture.add(base);

    // Gold ring on base
    const ringGeo = new THREE.TorusGeometry(0.62, 0.018, 12, 64);
    const ring = new THREE.Mesh(ringGeo, goldMat);
    ring.position.y = -1.26;
    ring.rotation.x = Math.PI / 2;
    sculpture.add(ring);

    // Abstract document planes
    const planeGeo = new THREE.PlaneGeometry(0.48, 0.65);
    for (let i = 0; i < 3; i++) {
      const plane = new THREE.Mesh(planeGeo, glassMat);
      plane.position.set((i - 1) * 0.32, -0.35 + i * 0.12, 0.45 + i * 0.08);
      plane.rotation.y = (i - 1) * 0.22;
      plane.rotation.x = -0.12;
      sculpture.add(plane);
    }

    sculpture.position.set(0.7, 0.1, 0);
    scene.add(sculpture);

    // ---- Floating particles (justice / court atmosphere) ----
    // Fewer on mobile for smoother performance
    const particleCount = isMobile ? 14 : 40;
    const lineCount = isMobile ? 3 : 8;
    const symbolCount = isMobile ? 4 : 12;

    const particlesGroup = new THREE.Group();
    const particleGeo = new THREE.SphereGeometry(0.018, isMobile ? 6 : 8, isMobile ? 6 : 8);
    const particleMatGold = new THREE.MeshBasicMaterial({ color: 0xc9b896, transparent: true, opacity: 0.55 });
    const particleMatSilver = new THREE.MeshBasicMaterial({ color: 0x9a9a9a, transparent: true, opacity: 0.35 });

    // Small floating orbs
    for (let i = 0; i < particleCount; i++) {
      const mat = i % 3 === 0 ? particleMatGold : particleMatSilver;
      const p = new THREE.Mesh(particleGeo, mat);
      p.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 7,
        (Math.random() - 0.5) * 6 - 1
      );
      p.userData = {
        baseY: p.position.y,
        speed: 0.15 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        amp: 0.15 + Math.random() * 0.25
      };
      particlesGroup.add(p);
    }

    // Thin geometric lines (court / architecture feel)
    const lineMat = new THREE.LineBasicMaterial({ color: 0xc9b896, transparent: true, opacity: 0.12 });
    for (let i = 0; i < lineCount; i++) {
      const points = [];
      const startY = (Math.random() - 0.5) * 5;
      points.push(new THREE.Vector3((Math.random() - 0.5) * 8, startY, (Math.random() - 0.5) * 4 - 1));
      points.push(new THREE.Vector3((Math.random() - 0.5) * 8, startY + (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 4 - 1));
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeo, lineMat);
      particlesGroup.add(line);
    }

    // Small diamond / octahedron symbols
    const symbolGeo = new THREE.OctahedronGeometry(0.04, 0);
    for (let i = 0; i < symbolCount; i++) {
      const sym = new THREE.Mesh(symbolGeo, i % 2 === 0 ? goldMat : brightMetalMat);
      sym.position.set(
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 5 - 0.5
      );
      sym.userData = {
        baseY: sym.position.y,
        speed: 0.1 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        amp: 0.1 + Math.random() * 0.2,
        type: 'symbol'
      };
      particlesGroup.add(sym);
    }

    scene.add(particlesGroup);

    // Resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    // Animation loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Lerp mouse
      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;

      if (sculpture) {
        // Idle rotation — slower & elegant
        sculpture.rotation.y = t * 0.06 + mouse.x * 0.3;
        sculpture.rotation.x = mouse.y * 0.1;

        // Subtle float
        sculpture.position.y = 0.1 + Math.sin(t * 0.35) * 0.05;

        // Fragment animation inside sculpture
        sculpture.children.forEach((child) => {
          if (child.userData && child.userData.type === 'frag') {
            child.position.y = child.userData.baseY + Math.sin(t * child.userData.speed + child.userData.angle) * 0.07;
            child.rotation.x += 0.0025;
            child.rotation.y += 0.0035;
          }
        });

        // Scroll influence
        const s = scrollProgress;
        sculpture.scale.setScalar(1 - s * 0.2);
        sculpture.position.x = 0.7 - s * 1.4;
        sculpture.position.z = s * -1.2;
      }

      // Animate floating particles & symbols
      if (particlesGroup) {
        particlesGroup.children.forEach((child) => {
          if (child.userData && child.userData.baseY !== undefined) {
            child.position.y = child.userData.baseY + Math.sin(t * child.userData.speed + child.userData.phase) * child.userData.amp;
            if (child.userData.type === 'symbol') {
              child.rotation.x += 0.004;
              child.rotation.y += 0.006;
            }
          }
        });
        // Very slow drift of whole particle field
        particlesGroup.rotation.y = t * 0.015;
      }

      // Camera subtle movement
      camera.position.x = mouse.x * 0.2;
      camera.position.y = 0.25 + mouse.y * 0.12;
      camera.lookAt(0, 0.1, 0);

      renderer.render(scene, camera);
    }
    animate();
  }

  // ============================================================
  // HERO ANIMATION
  // ============================================================
  function startHeroAnimation() {
    const nameLines = document.querySelectorAll('.hero-name .name-line');
    const title = document.querySelector('.hero-title');
    const tagline = document.querySelector('.hero-tagline');
    const meta = document.querySelector('.hero-meta');
    const hint = document.querySelector('.hero-scroll-hint');

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.to(meta, { opacity: 1, duration: 0.7 }, 0.1)

      // First name — whole word cinematic reveal (preserves Arabic joining)
      .to(nameLines[0], {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1.05,
        ease: 'power4.out'
      }, 0.2)

      // Last name follows
      .to(nameLines[1], {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1.1,
        ease: 'power4.out'
      }, 0.45)

      .to(title, { opacity: 1, y: 0, duration: 0.7 }, 1.15)
      .to(tagline, { opacity: 1, y: 0, duration: 0.7 }, 1.35)
      .to(hint, { opacity: 1, duration: 0.7 }, 1.65);
  }

  // ============================================================
  // SCROLL ANIMATIONS
  // ============================================================
  function initScrollAnimations() {
    // About title words
    gsap.utils.toArray('.title-word').forEach((word, i) => {
      gsap.to(word, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.about-title',
          start: 'top 75%',
          toggleActions: 'play none none reverse'
        },
        delay: i * 0.12
      });
    });

    // About text
    gsap.from('.about-text', {
      opacity: 0,
      y: 40,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.about-text',
        start: 'top 80%'
      }
    });

    // About meta
    gsap.from('.meta-item', {
      opacity: 0,
      x: 30,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.about-meta',
        start: 'top 85%'
      }
    });

    // Portrait
    gsap.from('.about-portrait', {
      opacity: 0,
      scale: 0.9,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.about-portrait',
        start: 'top 80%'
      }
    });

    // Method steps
    gsap.utils.toArray('.method-step').forEach((step) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 70%',
        end: 'bottom 40%',
        onEnter: () => step.classList.add('active'),
        onLeaveBack: () => step.classList.remove('active'),
        onEnterBack: () => step.classList.add('active'),
        onLeave: () => step.classList.remove('active')
      });
    });

    // Expertise items
    gsap.utils.toArray('.exp-item').forEach((item, i) => {
      gsap.from(item, {
        opacity: 0,
        y: 50,
        duration: 0.9,
        delay: i * 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: item,
          start: 'top 85%'
        }
      });
    });

    // Path items
    gsap.utils.toArray('.path-item').forEach((item, i) => {
      gsap.to(item, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        delay: i * 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: item,
          start: 'top 80%'
        }
      });
    });

    // Numbers
    gsap.from('.num-item', {
      opacity: 0,
      y: 60,
      duration: 1,
      stagger: 0.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.numbers-stage',
        start: 'top 75%'
      }
    });

    // Contact
    gsap.from('.contact-title', {
      opacity: 0,
      y: 50,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.section-contact',
        start: 'top 70%'
      }
    });

    gsap.from('.contact-link', {
      opacity: 0,
      y: 30,
      duration: 0.8,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.contact-links',
        start: 'top 80%'
      }
    });

    // Active nav links
    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top 40%',
        end: 'bottom 40%',
        onEnter: () => setActiveNav(section.id),
        onEnterBack: () => setActiveNav(section.id)
      });
    });
  }

  function setActiveNav(id) {
    document.querySelectorAll('.nav-links a').forEach((a) => {
      a.classList.toggle('active', a.getAttribute('data-section') === id);
    });
  }

  // ============================================================
  // NAV CLICKS (smooth via Lenis)
  // ============================================================
  function initNavClicks() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target && lenis) {
          lenis.scrollTo(target, { offset: -40, duration: 1.2 });
        }
        // Close mobile menu if open
        closeMobileMenu();
      });
    });
  }

  // ============================================================
  // MOBILE MENU
  // ============================================================
  function initMobileMenu() {
    const toggle = document.getElementById('nav-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.contains('is-open');
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileMenu();
    });
  }

  function openMobileMenu() {
    const toggle = document.getElementById('nav-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;
    menu.classList.add('is-open');
    toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
  }

  function closeMobileMenu() {
    const toggle = document.getElementById('nav-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;
    menu.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    initLoader();
    initCursor();
    initSmoothScroll();
    initThree();
    initScrollAnimations();
    initNavClicks();
    initMobileMenu();
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
