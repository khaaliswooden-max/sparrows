// LPC sprite renderer for The Sparrows.
// Composites female body + hair + torso layers from
// shared/assets/characters/<key>/ at runtime.
//
// LPC layout: each PNG is N frames wide x M directions tall (64px tiles).
// Direction rows: 0=up, 1=left, 2=down, 3=right.
// We render the "down" view (row 2) for the side-scroller (faces are most
// readable). Mirror horizontally for facingLeft.

const TILE = 64;

// Auto-detect asset root based on current document location.
// Landing index.html lives at /index.html, seasons live at /seasons/<slug>/index.html.
function defaultRoot() {
  if (typeof location === 'undefined') return 'shared/assets/characters';
  return location.pathname.includes('/seasons/')
    ? '../../shared/assets/characters'
    : './shared/assets/characters';
}
const ROOT = defaultRoot();

const CHARACTER_KEYS = ['cipher', 'venom', 'hawk', 'oracle'];

// LPC animation metadata: PNG name -> frames-per-row.
// walk[0] doubles as the idle pose; we don't ship a separate idle layer
// because LPC torso clothes only export motion animations.
const ANIMATIONS = {
  walk:  { frames: 9, row: 2 },
  slash: { frames: 6, row: 2 },
  hurt:  { frames: 6, row: 0 }, // hurt PNG has only one direction row
};

const cache = new Map();
let preloadPromise = null;

function loadImage(src) {
  if (cache.has(src)) return cache.get(src);
  const entry = { src, img: null, error: null };
  cache.set(src, entry);
  const img = new Image();
  img.onload = () => { entry.img = img; };
  img.onerror = () => { entry.error = new Error('Failed to load ' + src); };
  img.src = src;
  return entry;
}

export function preloadCharacters(rootOverride) {
  if (preloadPromise) return preloadPromise;
  const root = rootOverride || ROOT;
  const sources = [];
  for (const anim of Object.keys(ANIMATIONS)) {
    sources.push(`${root}/body/${anim}.png`);
    for (const key of CHARACTER_KEYS) {
      sources.push(`${root}/${key}/hair_${anim}.png`);
      sources.push(`${root}/${key}/torso_${anim}.png`);
    }
  }
  for (const src of sources) loadImage(src);

  preloadPromise = new Promise(resolve => {
    const check = () => {
      let pending = 0;
      let failed = 0;
      for (const src of sources) {
        const e = cache.get(src);
        if (!e.img && !e.error) pending++;
        if (e.error) failed++;
      }
      if (pending === 0) {
        resolve(failed === 0);
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
  return preloadPromise;
}

function getImg(src) {
  const entry = cache.get(src);
  return entry && entry.img ? entry.img : null;
}

// Public: draw character at (x, y) where (x, y) is centre-bottom.
export function drawCharacter(ctx, opts) {
  const {
    x, y, key,
    animation = 'walk',
    frame = 0,
    facingRight = true,
    scale = 1,
    rootOverride,
  } = opts;

  const root = rootOverride || ROOT;
  const animDef = ANIMATIONS[animation] || ANIMATIONS.walk;
  const frameIndex = ((frame % animDef.frames) + animDef.frames) % animDef.frames;

  const body  = getImg(`${root}/body/${animation}.png`);
  const hair  = getImg(`${root}/${key}/hair_${animation}.png`);
  const torso = getImg(`${root}/${key}/torso_${animation}.png`);

  if (!body) return false;

  const drawSize = TILE * scale;
  const dx = Math.round(x - drawSize / 2);
  const dy = Math.round(y - drawSize);
  const sx = frameIndex * TILE;
  const sy = animDef.row * TILE;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (!facingRight) {
    ctx.translate(dx + drawSize, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(body, sx, sy, TILE, TILE, 0, dy, drawSize, drawSize);
    if (torso) ctx.drawImage(torso, sx, sy, TILE, TILE, 0, dy, drawSize, drawSize);
    if (hair)  ctx.drawImage(hair,  sx, sy, TILE, TILE, 0, dy, drawSize, drawSize);
  } else {
    ctx.drawImage(body, sx, sy, TILE, TILE, dx, dy, drawSize, drawSize);
    if (torso) ctx.drawImage(torso, sx, sy, TILE, TILE, dx, dy, drawSize, drawSize);
    if (hair)  ctx.drawImage(hair,  sx, sy, TILE, TILE, dx, dy, drawSize, drawSize);
  }
  ctx.restore();
  return true;
}

// Renders a static head-and-shoulders portrait (frame 0, scaled crop) — used
// on the character-select cards. Returns a data URL once assets are ready,
// or null if not loaded yet.
export function renderPortrait(key, options = {}) {
  const { size = 96, rootOverride } = options;
  const root = rootOverride || ROOT;
  const body  = getImg(`${root}/body/walk.png`);
  const hair  = getImg(`${root}/${key}/hair_walk.png`);
  const torso = getImg(`${root}/${key}/torso_walk.png`);
  if (!body) return null;

  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const c = off.getContext('2d');
  c.imageSmoothingEnabled = false;
  // Crop the upper ~36px of the 64px frame (head + shoulders) at frame 0, row 2 (facing down).
  const sx = 0;
  const sy = 2 * TILE + 6; // top of head sits ~6px down
  const sw = TILE;
  const sh = 36;
  c.drawImage(body, sx, sy, sw, sh, 0, 0, size, size * (sh / sw));
  if (torso) c.drawImage(torso, sx, sy, sw, sh, 0, 0, size, size * (sh / sw));
  if (hair)  c.drawImage(hair,  sx, sy, sw, sh, 0, 0, size, size * (sh / sw));
  return off.toDataURL('image/png');
}

// Era helper — returns scale recommendations per season number (1-8).
export function eraConfig(season) {
  if (season <= 2) return { scale: 0.45, smoothing: false }; // Atari/NES
  if (season <= 4) return { scale: 1.00, smoothing: false }; // SNES/PS1
  if (season <= 6) return { scale: 1.40, smoothing: false }; // PS2/PS3
  return { scale: 1.80, smoothing: true };                   // PS4+
}

export const CHARACTER_META = {
  cipher: { name: 'CIPHER', codename: 'NATASHA', accent: '#50b8d8' },
  venom:  { name: 'VENOM',  codename: 'MARIA',   accent: '#58b868' },
  hawk:   { name: 'HAWK',   codename: 'ANYA',    accent: '#d88848' },
  oracle: { name: 'ORACLE', codename: 'OLGA',    accent: '#c8a040' },
};

export const CHARACTER_KEYS_LIST = CHARACTER_KEYS;
