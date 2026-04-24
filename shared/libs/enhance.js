// Sparrows enhancement module.
// Loaded as <script type="module"> in each season's index.html / mobile.html.
// Eagerly wires non-breaking helpers (mobile joystick, saves, mute hotkey) and
// exposes the full library set via window.Sparrows for opt-in use from game code.

import nipplejs from 'nipplejs';
import hotkeys from 'hotkeys-js';
import localforage from 'localforage';

const ns = (window.Sparrows ||= {});
ns.version = '0.1.0';

// ---------------------------------------------------------------------------
// Persistence (localforage) — prefers IndexedDB, falls back to localStorage
// ---------------------------------------------------------------------------
localforage.config({ name: 'sparrows', storeName: 'saves' });
ns.save = (key, val) => localforage.setItem(key, val);
ns.load = (key) => localforage.getItem(key);
ns.clearSaves = () => localforage.clear();
ns.localforage = localforage;

// ---------------------------------------------------------------------------
// AudioContext tracking + global mute (patched before any season creates one,
// since module scripts defer until season's lazy initAudio is user-triggered)
// ---------------------------------------------------------------------------
let muted = false;
(() => {
  const Orig = window.AudioContext || window.webkitAudioContext;
  if (!Orig) return;
  const ctxs = (ns._audioContexts = []);
  class Tracked extends Orig {
    constructor(...args) {
      super(...args);
      ctxs.push(this);
      if (muted) this.suspend?.();
    }
  }
  window.AudioContext = Tracked;
  if (window.webkitAudioContext) window.webkitAudioContext = Tracked;
  ns.setMuted = (on) => {
    muted = !!on;
    ctxs.forEach((c) => (muted ? c.suspend?.() : c.resume?.()));
    window.dispatchEvent(new CustomEvent('sparrows:mute', { detail: muted }));
  };
  ns.isMuted = () => muted;
})();

// ---------------------------------------------------------------------------
// Universal hotkeys (hotkeys-js)
//   M       — toggle mute
//   F11     — fullscreen first canvas
//   Shift+? — toggle controls hint overlay
// ---------------------------------------------------------------------------
hotkeys('m', () => ns.setMuted?.(!muted));

hotkeys('f11', (e) => {
  e.preventDefault();
  const cv = document.querySelector('canvas');
  if (!cv) return;
  if (!document.fullscreenElement) cv.requestFullscreen?.();
  else document.exitFullscreen?.();
});

let hintEl = null;
hotkeys('shift+/', () => {
  if (hintEl) { hintEl.remove(); hintEl = null; return; }
  hintEl = Object.assign(document.createElement('div'), {
    textContent: 'M: mute  •  F11: fullscreen  •  Shift+?: hide',
  });
  Object.assign(hintEl.style, {
    position: 'fixed', top: '8px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.82)', color: '#d4a050', padding: '6px 14px',
    font: '10px/1 system-ui, sans-serif', letterSpacing: '1px',
    border: '1px solid rgba(212,160,80,0.45)', zIndex: 9999, pointerEvents: 'none',
  });
  document.body.appendChild(hintEl);
});

ns.hotkeys = hotkeys;

// ---------------------------------------------------------------------------
// Universal toggle bar (top-right) + CRT scanline/vignette overlay.
// Persisted in localStorage; mute button stays in sync with M hotkey.
// ---------------------------------------------------------------------------
{
  const style = document.createElement('style');
  style.textContent = `
    body.sparrows-crt::before {
      content: ''; position: fixed; inset: 0; z-index: 9990; pointer-events: none;
      background: repeating-linear-gradient(to bottom, rgba(0,0,0,0.28) 0 1px, transparent 1px 3px);
      mix-blend-mode: multiply;
    }
    body.sparrows-crt::after {
      content: ''; position: fixed; inset: 0; z-index: 9991; pointer-events: none;
      background: radial-gradient(ellipse at center, transparent 48%, rgba(0,0,0,0.55) 100%);
    }
    .sparrows-toggles {
      position: fixed; top: 10px; right: 10px; z-index: 9995;
      display: flex; gap: 6px;
    }
    .sparrows-toggles button {
      width: 34px; height: 34px; border-radius: 6px;
      background: rgba(18,18,26,0.72); border: 1px solid #2a2a36;
      color: #9090a0; font: 14px/1 system-ui, sans-serif;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: color 0.2s, border-color 0.2s, background 0.2s;
      backdrop-filter: blur(4px); padding: 0;
    }
    .sparrows-toggles button:hover { color: #f0c878; border-color: #d4a050; }
    .sparrows-toggles button[data-on="true"] {
      color: #f0c878; border-color: #d4a050; background: rgba(212,160,80,0.12);
    }
  `;
  document.head.appendChild(style);

  if (localStorage.getItem('sparrows:crt') === 'on') document.body.classList.add('sparrows-crt');
  if (localStorage.getItem('sparrows:mute') === 'on') ns.setMuted?.(true);

  const bar = document.createElement('div');
  bar.className = 'sparrows-toggles';
  bar.innerHTML = `
    <button type="button" data-role="crt" title="Toggle CRT overlay" aria-label="Toggle CRT overlay">▚</button>
    <button type="button" data-role="mute" title="Toggle mute (M)" aria-label="Toggle mute">♪</button>
  `;
  document.body.appendChild(bar);

  const crtBtn = bar.querySelector('[data-role="crt"]');
  const muteBtn = bar.querySelector('[data-role="mute"]');

  const syncCrt = () => { crtBtn.dataset.on = document.body.classList.contains('sparrows-crt'); };
  const syncMute = () => { muteBtn.dataset.on = !!ns.isMuted?.(); };

  crtBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('sparrows-crt');
    localStorage.setItem('sparrows:crt', on ? 'on' : 'off');
    syncCrt();
  });
  muteBtn.addEventListener('click', () => {
    const on = !ns.isMuted?.();
    ns.setMuted?.(on);
    localStorage.setItem('sparrows:mute', on ? 'on' : 'off');
  });
  window.addEventListener('sparrows:mute', (e) => {
    localStorage.setItem('sparrows:mute', e.detail ? 'on' : 'off');
    syncMute();
  });

  syncCrt();
  syncMute();
  ns.toggleBar = bar;
}

// ---------------------------------------------------------------------------
// Virtual joystick on touch devices (skip mobile.html — they have custom UIs)
// Emits synthetic Arrow{Up,Down,Left,Right} + Space keyboard events so
// existing game loops listening on document work unchanged.
// ---------------------------------------------------------------------------
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const isMobileHtml = /\/mobile\.html$/.test(location.pathname);

if (isTouch && !isMobileHtml) {
  const zone = document.createElement('div');
  zone.id = 'sparrows-joystick';
  Object.assign(zone.style, {
    position: 'fixed', left: '14px', bottom: '14px',
    width: '140px', height: '140px', zIndex: 9998, touchAction: 'none',
  });
  document.body.appendChild(zone);

  const joy = nipplejs.create({
    zone,
    mode: 'static',
    position: { left: '70px', bottom: '70px' },
    color: '#d4a050',
    size: 120,
  });

  const held = { up: false, down: false, left: false, right: false };
  const codeFor = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  const press = (d, on) => {
    if (held[d] === on) return;
    held[d] = on;
    document.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', {
      key: codeFor[d], code: codeFor[d], bubbles: true, cancelable: true,
    }));
  };

  joy.on('dir', (_e, data) => {
    const d = data.direction?.angle;
    ['up', 'down', 'left', 'right'].forEach((k) => press(k, k === d));
  });
  joy.on('end', () => ['up', 'down', 'left', 'right'].forEach((d) => press(d, false)));

  const btn = document.createElement('div');
  btn.id = 'sparrows-action';
  btn.textContent = 'A';
  Object.assign(btn.style, {
    position: 'fixed', right: '22px', bottom: '48px',
    width: '78px', height: '78px', borderRadius: '50%',
    background: 'rgba(212,160,80,0.22)', color: '#fff',
    font: 'bold 24px system-ui, sans-serif',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    userSelect: 'none', touchAction: 'none', zIndex: 9998,
    border: '2px solid rgba(212,160,80,0.6)',
  });
  const space = (on) => document.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', {
    key: ' ', code: 'Space', bubbles: true, cancelable: true,
  }));
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); space(true); });
  btn.addEventListener('touchend', (e) => { e.preventDefault(); space(false); });
  btn.addEventListener('touchcancel', () => space(false));
  document.body.appendChild(btn);

  ns.joystick = joy;
}

ns.nipplejs = nipplejs;

// ---------------------------------------------------------------------------
// Lazy loaders for heavier libs — callers opt in when they need them.
// Example:  const { Howl } = await Sparrows.loadHowler();
// ---------------------------------------------------------------------------
ns.loadTone = () => import('tone');
ns.loadHowler = () => import('howler');
ns.loadJsfxr = () => import('jsfxr');
ns.loadGsap = () => import('gsap');
ns.loadLilGui = () => import('lil-gui');
ns.loadPixiFilters = () => import('pixi-filters');
ns.loadMousetrap = () => import('mousetrap');
ns.loadZustand = () => import('zustand/vanilla');
ns.loadPhaser = () => import('phaser');

console.info('[Sparrows] enhancement module ready', Object.keys(ns));
