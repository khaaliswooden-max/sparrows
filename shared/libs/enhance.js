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

// Per-season progress API, auto-scoped by URL path
// e.g. /seasons/season3-snes/index.html → slug "season3-snes"
const seasonSlug = location.pathname.match(/\/seasons\/([^/]+)\//)?.[1] ?? null;
ns.seasonSlug = seasonSlug;
ns.progress = {
  async set(key, val) {
    if (!seasonSlug) return;
    await localforage.setItem(`p:${seasonSlug}:${key}`, val);
  },
  async get(key) {
    if (!seasonSlug) return null;
    return localforage.getItem(`p:${seasonSlug}:${key}`);
  },
  async all(slug = seasonSlug) {
    if (!slug) return {};
    const out = {};
    const prefix = `p:${slug}:`;
    await localforage.iterate((v, k) => { if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v; });
    return out;
  },
  async lastSession() { return localforage.getItem('lastSession'); },
  async clearSeason(slug = seasonSlug) {
    if (!slug) return;
    const keys = [];
    await localforage.iterate((_v, k) => { if (k.startsWith(`p:${slug}:`)) keys.push(k); });
    await Promise.all(keys.map((k) => localforage.removeItem(k)));
  },
};
if (seasonSlug) {
  localforage.setItem('lastSession', {
    season: seasonSlug,
    url: location.pathname,
    mobile: /\/mobile\.html$/.test(location.pathname),
    t: Date.now(),
  });
}

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
    <button type="button" data-role="crt"  title="Toggle CRT overlay (CSS)" aria-label="Toggle CRT overlay">▚</button>
    <button type="button" data-role="pcrt" title="Premium CRT (Pixi shader — heavier)" aria-label="Premium CRT shader">◉</button>
    <button type="button" data-role="mute" title="Toggle mute (M)" aria-label="Toggle mute">♪</button>
  `;
  document.body.appendChild(bar);

  const crtBtn  = bar.querySelector('[data-role="crt"]');
  const pcrtBtn = bar.querySelector('[data-role="pcrt"]');
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

  // -------- Premium CRT (Pixi CRTFilter over the game canvas) --------------
  let pcrt = null; // { app, sprite, texture, filter, overlay, rafId }

  const enablePremiumCrt = async () => {
    if (pcrt) return true;
    try {
      const [pixi, pf] = await Promise.all([import('pixi.js'), import('pixi-filters')]);
      const { Application, Sprite, Texture } = pixi;
      const { CRTFilter } = pf;
      const src = document.querySelector('canvas');
      if (!src) throw new Error('no game canvas found');

      const overlay = document.createElement('canvas');
      overlay.id = 'sparrows-pcrt-overlay';
      Object.assign(overlay.style, {
        position: 'fixed', pointerEvents: 'none', zIndex: 9988,
        imageRendering: 'pixelated',
      });
      document.body.appendChild(overlay);

      const app = new Application();
      await app.init({
        canvas: overlay,
        width: src.width || 320,
        height: src.height || 240,
        backgroundAlpha: 0,
        antialias: false,
        autoDensity: true,
        resolution: 1,
      });

      const texture = Texture.from(src);
      const sprite = new Sprite(texture);
      const filter = new CRTFilter({
        curvature: 3,
        lineWidth: 2.4,
        lineContrast: 0.28,
        noise: 0.18,
        noiseSize: 1,
        vignetting: 0.32,
        vignettingAlpha: 0.7,
        vignettingBlur: 0.3,
        time: 0,
      });
      sprite.filters = [filter];
      app.stage.addChild(sprite);

      const syncRect = () => {
        const r = src.getBoundingClientRect();
        overlay.style.left = r.left + 'px';
        overlay.style.top = r.top + 'px';
        overlay.style.width = r.width + 'px';
        overlay.style.height = r.height + 'px';
        if (app.renderer.width !== src.width || app.renderer.height !== src.height) {
          app.renderer.resize(src.width, src.height);
          sprite.width = src.width;
          sprite.height = src.height;
        }
      };
      syncRect();

      let tick = 0;
      const step = () => {
        texture.source.update();
        filter.time = (tick += 0.5);
        syncRect();
        pcrt.rafId = requestAnimationFrame(step);
      };

      pcrt = { app, sprite, texture, filter, overlay, rafId: 0 };
      pcrt.rafId = requestAnimationFrame(step);
      return true;
    } catch (err) {
      console.warn('[Sparrows] Premium CRT unavailable:', err.message || err);
      return false;
    }
  };

  const disablePremiumCrt = () => {
    if (!pcrt) return;
    cancelAnimationFrame(pcrt.rafId);
    try { pcrt.app.destroy(true, { children: true, texture: true }); } catch {}
    pcrt.overlay.remove();
    pcrt = null;
  };

  const setPcrtButton = (state) => {
    pcrtBtn.dataset.on = state;
    pcrtBtn.disabled = state === 'busy';
  };

  pcrtBtn.addEventListener('click', async () => {
    if (pcrt) {
      disablePremiumCrt();
      setPcrtButton('false');
      localStorage.setItem('sparrows:pcrt', 'off');
    } else {
      setPcrtButton('busy');
      const ok = await enablePremiumCrt();
      setPcrtButton(ok ? 'true' : 'false');
      if (ok) localStorage.setItem('sparrows:pcrt', 'on');
    }
  });

  if (localStorage.getItem('sparrows:pcrt') === 'on') {
    setPcrtButton('busy');
    enablePremiumCrt().then((ok) => setPcrtButton(ok ? 'true' : 'false'));
  } else {
    setPcrtButton('false');
  }

  ns.enablePremiumCrt = enablePremiumCrt;
  ns.disablePremiumCrt = disablePremiumCrt;
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

  // Per-season action button config — declared by era controls in README.
  // Each entry: { l: label, code: KeyboardEvent.code, key?: KeyboardEvent.key }
  const BUTTONS = {
    'season1-atari':   [{ l: 'ACT',  code: 'Space' }],
    'season2-nes':     [{ l: 'JMP',  code: 'KeyZ' }, { l: 'ATK',  code: 'KeyX' }, { l: 'SW',  code: 'KeyC' }],
    'season3-snes':    [{ l: 'ATK',  code: 'KeyZ' }, { l: 'JMP',  code: 'KeyX' }, { l: 'SPC', code: 'KeyC' }, { l: 'SW', code: 'KeyA' }],
    'season4-ps1':     [{ l: 'INT',  code: 'Space' }, { l: 'CQC', code: 'KeyE' }, { l: 'GDG', code: 'KeyQ' }, { l: 'SNK', code: 'ShiftLeft' }],
    'season5-ps2':     [{ l: 'INT',  code: 'Space' }, { l: 'TKD', code: 'KeyE' }, { l: 'VIS', code: 'KeyF' }, { l: 'ABL', code: 'KeyQ' }],
    'season6-ps3':     [{ l: 'COV',  code: 'Space' }, { l: 'RLD', code: 'KeyR' }, { l: 'ABL', code: 'KeyQ' }],
    'season7-ps4':     [{ l: 'COV',  code: 'Space' }, { l: 'RLD', code: 'KeyR' }, { l: 'ABL', code: 'KeyQ' }, { l: 'MED', code: 'KeyH' }],
    'season8-current': [{ l: 'DG',   code: 'Space' }, { l: 'RLD', code: 'KeyR' }, { l: 'ABL', code: 'KeyQ' }, { l: 'ULT', code: 'KeyE' }],
  };
  const keyForCode = (code) => {
    if (code === 'Space') return ' ';
    if (code.startsWith('Key')) return code.slice(3).toLowerCase();
    if (code.startsWith('Digit')) return code.slice(5);
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
    if (code === 'ControlLeft' || code === 'ControlRight') return 'Control';
    if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
    return code;
  };
  const synth = (code, on) => {
    document.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', {
      key: keyForCode(code), code,
      bubbles: true, cancelable: true,
      shiftKey: code.startsWith('Shift'),
      ctrlKey: code.startsWith('Control'),
      altKey: code.startsWith('Alt'),
    }));
  };

  const buttons = BUTTONS[seasonSlug] ?? [{ l: 'A', code: 'Space' }];
  const pad = document.createElement('div');
  pad.id = 'sparrows-action-pad';
  Object.assign(pad.style, {
    position: 'fixed', right: '16px', bottom: '20px',
    display: 'grid', gap: '6px', zIndex: 9998,
    gridTemplateColumns: buttons.length >= 3 ? '1fr 1fr' : '1fr',
  });
  buttons.forEach(({ l, code }, i) => {
    const size = buttons.length === 1 ? 78 : buttons.length <= 2 ? 68 : 58;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = l;
    Object.assign(b.style, {
      width: size + 'px', height: size + 'px', borderRadius: '50%',
      background: 'rgba(212,160,80,0.22)', color: '#fff',
      font: `bold ${Math.round(size * 0.22)}px system-ui, sans-serif`,
      letterSpacing: '1px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      userSelect: 'none', touchAction: 'none',
      border: '2px solid rgba(212,160,80,0.6)', padding: '0',
      justifySelf: buttons.length >= 3 && i % 2 === 0 ? 'end' : 'start',
    });
    b.addEventListener('touchstart', (e) => { e.preventDefault(); synth(code, true); });
    b.addEventListener('touchend',   (e) => { e.preventDefault(); synth(code, false); });
    b.addEventListener('touchcancel', () => synth(code, false));
    pad.appendChild(b);
  });
  document.body.appendChild(pad);

  ns.joystick = joy;
  ns.actionPad = pad;
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
