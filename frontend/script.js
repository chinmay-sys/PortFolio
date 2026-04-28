/* ====================================================================
   PORTFOLIO INTERACTIONS — Chinmay CP
   Features: Particle canvas, Terminal typing, Custom cursor, 3D cards,
             Scroll reveal, Scroll-spy, Command palette, Toast system
   ==================================================================== */

// ─── 1. PARTICLE CONSTELLATION ────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles = [], mouse = { x: -999, y: -999 };
  const COUNT = 80, CONNECT_DIST = 120, MOUSE_DIST = 160;

  function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize);
  resize();

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1
    });
  }

  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  function draw() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      // Draw dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(129,140,248,0.35)';
      ctx.fill();

      // Connect nearby particles
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < CONNECT_DIST) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(129,140,248,${0.12 * (1 - d / CONNECT_DIST)})`;
          ctx.lineWidth = 0.6; ctx.stroke();
        }
      }

      // Mouse attraction lines
      const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      if (dm < MOUSE_DIST) {
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(251,191,36,${0.3 * (1 - dm / MOUSE_DIST)})`;
        ctx.lineWidth = 0.8; ctx.stroke();
        // Gentle push
        p.vx += (mouse.x - p.x) * 0.00008;
        p.vy += (mouse.y - p.y) * 0.00008;
      }
    });
    requestAnimationFrame(draw);
  }
  draw();
})();


// ─── 2. CUSTOM CURSOR ─────────────────────────────────────────────
(function initCursor() {
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring || window.innerWidth < 769) return;

  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  function loop() {
    rx += (mx - rx) * 0.15; ry += (my - ry) * 0.15;
    dot.style.transform = `translate(${mx - 4}px, ${my - 4}px)`;
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(loop);
  }
  loop();

  // Enlarge on hover over interactive elements
  document.querySelectorAll('a, button, .card, .skill, .nav-hint, .brand').forEach(el => {
    el.addEventListener('mouseenter', () => {
      ring.style.width = '56px'; ring.style.height = '56px';
      ring.style.borderColor = 'var(--gold)';
      dot.style.transform = `translate(${mx - 4}px, ${my - 4}px) scale(2)`;
    });
    el.addEventListener('mouseleave', () => {
      ring.style.width = '36px'; ring.style.height = '36px';
      ring.style.borderColor = 'var(--accent)';
      dot.style.transform = `translate(${mx - 4}px, ${my - 4}px) scale(1)`;
    });
  });
})();


// ─── 3. TERMINAL TYPING EFFECT ────────────────────────────────────
(function initTerminal() {
  const body = document.getElementById('terminalBody');
  if (!body) return;

  const lines = [
    { type: 'cmd',  text: '$ whoami' },
    { type: 'out',  text: 'Chinmay CP — Full Stack Developer' },
    { type: 'cmd',  text: '$ cat skills.json' },
    { type: 'out',  text: '["JavaScript","Python","Node.js","Java","ML"]' },
    { type: 'cmd',  text: '$ cat mission.txt' },
    { type: 'out',  text: 'Building clean, user-friendly experiences.' },
    { type: 'cmd',  text: '$ echo "Let\'s connect!"' },
  ];

  let lineIdx = 0, charIdx = 0;
  const SPEED = 38, LINE_PAUSE = 400;

  function createLine(type) {
    const div = document.createElement('div');
    div.className = type === 'cmd' ? 'prompt' : 'output';
    body.appendChild(div);
    return div;
  }

  function typeLine() {
    if (lineIdx >= lines.length) {
      // Add blinking cursor at end
      const cursor = document.createElement('span');
      cursor.className = 'cursor-blink';
      body.lastElementChild.appendChild(cursor);
      return;
    }
    const { type, text } = lines[lineIdx];
    const el = createLine(type);

    function typeChar() {
      if (charIdx < text.length) {
        el.textContent += text[charIdx++];
        setTimeout(typeChar, type === 'cmd' ? SPEED : SPEED / 2);
      } else {
        charIdx = 0; lineIdx++;
        setTimeout(typeLine, LINE_PAUSE);
      }
    }
    typeChar();
  }
  // Start after a short delay
  setTimeout(typeLine, 600);
})();


// ─── 4. SCROLL REVEAL ─────────────────────────────────────────────
(function initReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.15 });
  els.forEach(el => obs.observe(el));
})();


// ─── 5. SCROLL-SPY ───────────────────────────────────────────────
(function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('.nav a[href^="#"]');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 200) current = s.id; });
    links.forEach(a => { a.classList.toggle('active', a.getAttribute('href') === '#' + current); });
  });
})();


// ─── 6. 3D CARD TILT + SHINE ─────────────────────────────────────
(function initTilt() {
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const cx = rect.width / 2, cy = rect.height / 2;
      const rotateX = ((y - cy) / cy) * -8;
      const rotateY = ((x - cx) / cx) * 8;
      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
      card.style.setProperty('--sx', x + 'px');
      card.style.setProperty('--sy', y + 'px');
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(600px) rotateX(0) rotateY(0) scale(1)';
    });
  });
})();


// ─── 7. SKILL CARD MOUSE GLOW ────────────────────────────────────
(function initSkillGlow() {
  document.querySelectorAll('.skill').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
      card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
    });
  });
})();


// ─── 8. SMOOTH SCROLLING ──────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Close command palette if open
    const palette = document.getElementById('commandPalette');
    if (palette) palette.hidden = true;
  });
});


// ─── 9. CONTACT FORM + TOAST ──────────────────────────────────────
(function initContactForm() {
  const form = document.getElementById('contactForm');
  const toast = document.getElementById('toast');
  if (!form) return;

  function showToast(msg, success) {
    toast.textContent = msg;
    toast.style.borderColor = success ? 'var(--accent)' : '#ff5f57';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const btnSpan = btn.querySelector('span');
    btn.disabled = true;
    btnSpan.textContent = 'Sending...';
    const payload = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      message: document.getElementById('message').value.trim()
    };
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('✓ Message sent successfully!', true);
        form.reset();
      } else {
        showToast('✗ Failed to send. Please try again.', false);
      }
    } catch {
      showToast('✗ Could not reach server.', false);
    } finally {
      btn.disabled = false;
      btnSpan.textContent = 'Send Message';
    }
  });
})();


// ─── 10. COMMAND PALETTE (Ctrl+K) ─────────────────────────────────
(function initCommandPalette() {
  const palette = document.getElementById('commandPalette');
  const input = document.getElementById('cmdInput');
  const list = document.getElementById('cmdList');
  if (!palette || !input || !list) return;

  const hint = document.querySelector('.nav-hint');
  if (hint) hint.addEventListener('click', () => openPalette());

  function openPalette() {
    palette.hidden = false;
    input.value = '';
    filterList('');
    setTimeout(() => input.focus(), 50);
  }
  function closePalette() { palette.hidden = true; }

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openPalette(); }
    if (e.key === 'Escape') closePalette();
  });

  palette.querySelector('.cmd-overlay').addEventListener('click', closePalette);

  function filterList(q) {
    const items = list.querySelectorAll('li');
    q = q.toLowerCase();
    items.forEach(li => { li.hidden = q && !li.textContent.toLowerCase().includes(q); });
  }
  input.addEventListener('input', () => filterList(input.value));

  const actions = {
    home: () => document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' }),
    about: () => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }),
    skills: () => document.getElementById('skills')?.scrollIntoView({ behavior: 'smooth' }),
    projects: () => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' }),
    contact: () => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }),
    github: () => window.open('https://github.com/chinmay-sys', '_blank'),
    email: () => window.location.href = 'mailto:chinmaycp13@gmail.com',
    theme: () => document.body.classList.toggle('light-mode'),
  };

  list.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    const action = li.dataset.action;
    if (actions[action]) { actions[action](); closePalette(); }
  });

  // Keyboard nav
  list.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.target.click(); }
  });
})();


// ─── 11. FOOTER YEAR ──────────────────────────────────────────────
const yearEl = document.getElementById('currentYear');
if (yearEl) yearEl.textContent = new Date().getFullYear();
