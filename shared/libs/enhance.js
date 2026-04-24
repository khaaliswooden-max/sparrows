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
