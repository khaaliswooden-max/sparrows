// Landing page graphics / FX / SFX.
// Loaded as <script type="module"> from index.html at repo root.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sfxr } from 'jsfxr';
import localforage from 'localforage';

localforage.config({ name: 'sparrows', storeName: 'saves' });

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const q = (sel) => document.querySelector(sel);
const qa = (sel) => [...document.querySelectorAll(sel)];

// ---------------------------------------------------------------------------
// Animated nebula + parallax starfield (bg canvas)
// ---------------------------------------------------------------------------
{
  const cv = q('#bg-canvas');
  const ctx = cv.getContext('2d');
  const DPR = Math.min(2, devicePixelRatio || 1);
  let W = 0, H = 0;
  const stars = [];
  const nebs = [];

  const resize = () => {
    W = cv.width = innerWidth * DPR;
    H = cv.height = innerHeight * DPR;
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
  };
  addEventListener('resize', resize, { passive: true });
  resize();

  const N_STARS = reduced ? 80 : 240;
  for (let i = 0; i < N_STARS; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      z: 0.25 + Math.random() * 0.9,
      r: 0.5 + Math.random() * 1.3,
      tw: Math.random() * Math.PI * 2,
    });
  }

  const palette = ['#d4a050', '#50b8d8', '#58b868', '#d88848', '#7848c8', '#4888c8'];
  const N_NEBS = reduced ? 3 : 7;
  for (let i = 0; i < N_NEBS; i++) {
    nebs.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: (200 + Math.random() * 260) * DPR,
      c: palette[i % palette.length],
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
    });
  }

  let mx = W / 2, my = H / 2, sy = 0;
  addEventListener('mousemove', (e) => { mx = e.clientX * DPR; my = e.clientY * DPR; }, { passive: true });
  addEventListener('scroll', () => { sy = scrollY; }, { passive: true });

  const frame = () => {
    ctx.fillStyle = 'rgba(3, 3, 5, 0.42)';
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    for (const n of nebs) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < -n.r) n.x = W + n.r; else if (n.x > W + n.r) n.x = -n.r;
      if (n.y < -n.r) n.y = H + n.r; else if (n.y > H + n.r) n.y = -n.r;
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0.00, n.c + '28');
      g.addColorStop(0.45, n.c + '0c');
      g.addColorStop(1.00, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    const pdx = (mx - W / 2) * 0.015;
    const pdy = (my - H / 2) * 0.015 - sy * 0.15 * DPR;
    for (const s of stars) {
      s.tw += 0.025;
      const a = (0.35 + Math.sin(s.tw) * 0.35) * s.z;
      ctx.fillStyle = `rgba(240, 240, 255, ${a})`;
      ctx.beginPath();
      ctx.arc(s.x + pdx * s.z, s.y + pdy * s.z, s.r * s.z * DPR, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  };
  frame();
}

// ---------------------------------------------------------------------------
// SFX via jsfxr — off by default, toggle stored in localStorage
// ---------------------------------------------------------------------------
let sfxOn = localStorage.getItem('sparrows:sfx') === 'on';
const cache = {};
const play = (name) => {
  if (!sfxOn) return;
  cache[name] ??= sfxr.generate(name);
  try { sfxr.play(cache[name]); } catch { /* blocked until user gesture */ }
};

const sfxBtn = q('#sfx-toggle');
if (sfxBtn) {
  sfxBtn.dataset.on = sfxOn;
  sfxBtn.addEventListener('click', () => {
    sfxOn = !sfxOn;
    localStorage.setItem('sparrows:sfx', sfxOn ? 'on' : 'off');
    sfxBtn.dataset.on = sfxOn;
    if (sfxOn) play('powerUp');
  });
}

qa('.season-card').forEach((card) => card.addEventListener('pointerenter', () => play('blipSelect')));
qa('.play-btn').forEach((btn) => btn.addEventListener('pointerdown', () => play('click')));

// ---------------------------------------------------------------------------
// CRT toggle — body.crt class adds scanlines + vignette via CSS
// ---------------------------------------------------------------------------
const crtBtn = q('#crt-toggle');
if (crtBtn) {
  const initialCrt = localStorage.getItem('sparrows:crt') === 'on';
  if (initialCrt) document.body.classList.add('crt');
  crtBtn.dataset.on = initialCrt;
  crtBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('crt');
    localStorage.setItem('sparrows:crt', on ? 'on' : 'off');
    crtBtn.dataset.on = on;
    play('click');
  });
}

// ---------------------------------------------------------------------------
// GSAP entrance + scroll-triggered card reveal
// ---------------------------------------------------------------------------
if (!reduced) {
  gsap.from('header .bird-svg', { y: 30, scale: 0.6, opacity: 0, duration: 0.9, ease: 'back.out(1.6)' });
  gsap.from('header h1', { y: 40, opacity: 0, duration: 0.9, delay: 0.15, ease: 'power3.out' });
  gsap.from('.subtitle', { y: 24, opacity: 0, duration: 0.7, delay: 0.35, ease: 'power3.out' });
  gsap.from('.tagline', { opacity: 0, duration: 0.5, delay: 0.55 });
  gsap.from('.character', {
    y: 30, opacity: 0, stagger: 0.08, duration: 0.6, delay: 0.55, ease: 'back.out(1.4)',
  });

  qa('.season-card').forEach((card) => {
    gsap.from(card, {
      y: 70, opacity: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none none' },
    });
  });

  gsap.from('.how-to-play', {
    y: 40, opacity: 0, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.how-to-play', start: 'top 90%' },
  });
  gsap.from('footer', {
    y: 30, opacity: 0, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: 'footer', start: 'top 95%' },
  });
}

// ---------------------------------------------------------------------------
// Typing tagline
// ---------------------------------------------------------------------------
if (!reduced) {
  const el = q('.tagline');
  if (el) {
    const text = el.textContent.trim();
    el.textContent = '';
    el.style.minHeight = '1.2em';
    let i = 0;
    const step = () => {
      if (i <= text.length) {
        el.textContent = text.slice(0, i++);
        setTimeout(step, 22);
      }
    };
    setTimeout(step, 700);
  }
}

// ---------------------------------------------------------------------------
// "Continue" banner — surfaces last visited season from localforage
// ---------------------------------------------------------------------------
{
  const banner = q('#continue-banner');
  if (banner) {
    localforage.getItem('lastSession').then((s) => {
      if (!s || !s.season) return;
      const ageH = (Date.now() - s.t) / 3600e3;
      if (ageH > 30 * 24) return; // hide after 30 days
      const num = s.season.match(/season(\d)/)?.[1];
      if (!num) return;
      const link = banner.querySelector('a');
      link.href = s.url;
      banner.querySelector('.cont-label').textContent = `SEASON ${num}${s.mobile ? ' • MOBILE' : ''}`;
      banner.hidden = false;
      if (!reduced) gsap.from(banner, { y: -20, opacity: 0, duration: 0.6, delay: 0.2, ease: 'power2.out' });
    });
  }
}

// ---------------------------------------------------------------------------
// Subtle card tilt on pointer move
// ---------------------------------------------------------------------------
if (!reduced && !matchMedia('(hover: none)').matches) {
  qa('.season-card').forEach((card) => {
    const qx = gsap.quickTo(card, 'rotationY', { duration: 0.35, ease: 'power2.out' });
    const qy = gsap.quickTo(card, 'rotationX', { duration: 0.35, ease: 'power2.out' });
    gsap.set(card, { transformPerspective: 900, transformStyle: 'preserve-3d' });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      qx(((e.clientX - r.left) / r.width - 0.5) * 5);
      qy(-((e.clientY - r.top) / r.height - 0.5) * 5);
    });
    card.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });
}
