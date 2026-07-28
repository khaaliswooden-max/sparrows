// THE SPARROWS — Epilogue: Afterglow
// A real-time 3D Gaussian Splatting renderer + walkable epilogue, zero dependencies.
//
// The series marches through the history of game graphics; this season steps past
// "Current Gen" into the neural-rendering era (2023+). The whole world — ground,
// sky, statues, trees, birds — is ~22,000 anisotropic 3D gaussians, projected to
// screen-space 2D gaussians per frame (EWA splatting: Σ' = J·W·Σ·Wᵀ·Jᵀ),
// depth-sorted with a counting sort and alpha-blended back-to-front.
//
// Shell pages set window.SPARROWS_SPLAT_MODE = 'desktop' | 'mobile'.

'use strict';

const MODE = window.SPARROWS_SPLAT_MODE === 'mobile' ? 'mobile' : 'desktop';
const canvas = document.getElementById('c');
const frame = canvas.parentElement; // .gf container — overlays get appended here

// ---------------------------------------------------------------------------
// Deterministic RNG — the garden is a "reconstruction", it must look the same
// on every visit.
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(1977); // the year the first season's console launched

// ---------------------------------------------------------------------------
// Small math helpers
// ---------------------------------------------------------------------------
const TAU = Math.PI * 2;

function hexRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Rotation matrix (3x3, row-major nested arrays) from yaw (Y), pitch (X), roll (Z)
function rotYXZ(yaw, pitch, roll) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  // R = Ry * Rx * Rz
  return [
    [cy * cr + sy * sp * sr, -cy * sr + sy * sp * cr, sy * cp],
    [cp * sr, cp * cr, -sp],
    [-sy * cr + cy * sp * sr, sy * sr + cy * sp * cr, cy * cp],
  ];
}

// Orthonormal basis whose local X axis points along dir — used to stretch
// splats along a stroke direction (wings, arcs).
function basisAlongX(dx, dy, dz) {
  const l = Math.hypot(dx, dy, dz) || 1;
  const t = [dx / l, dy / l, dz / l];
  const upWorld = Math.abs(t[1]) > 0.94 ? [1, 0, 0] : [0, 1, 0];
  // n = normalize(up × t), b = t × n
  let nx = upWorld[1] * t[2] - upWorld[2] * t[1];
  let ny = upWorld[2] * t[0] - upWorld[0] * t[2];
  let nz = upWorld[0] * t[1] - upWorld[1] * t[0];
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl; ny /= nl; nz /= nl;
  const bx = t[1] * nz - t[2] * ny;
  const by = t[2] * nx - t[0] * nz;
  const bz = t[0] * ny - t[1] * nx;
  // columns are the local axes
  return [
    [t[0], nx, bx],
    [t[1], ny, by],
    [t[2], nz, bz],
  ];
}

// ---------------------------------------------------------------------------
// Splat store — interleaved records of 13 floats:
//   [ px py pz | c00 c01 c02 | c11 c12 c22 | r g b opacity ]
// The 3D covariance Σ = R·S·S·Rᵀ is baked here once; the GPU projects it.
// ---------------------------------------------------------------------------
const FLOATS = 13;
const MAX_SPLATS = 26000;
const src = new Float32Array(MAX_SPLATS * FLOATS);
let count = 0;

function addSplat(x, y, z, sx, sy, sz, R, r, g, b, opacity) {
  if (count >= MAX_SPLATS) return -1;
  const o = count * FLOATS;
  const s = [sx * sx, sy * sy, sz * sz];
  // Σ_ij = Σ_k R[i][k]·s_k²·R[j][k]
  let c00 = 0, c01 = 0, c02 = 0, c11 = 0, c12 = 0, c22 = 0;
  if (R) {
    for (let k = 0; k < 3; k++) {
      c00 += R[0][k] * R[0][k] * s[k];
      c01 += R[0][k] * R[1][k] * s[k];
      c02 += R[0][k] * R[2][k] * s[k];
      c11 += R[1][k] * R[1][k] * s[k];
      c12 += R[1][k] * R[2][k] * s[k];
      c22 += R[2][k] * R[2][k] * s[k];
    }
  } else {
    c00 = s[0]; c11 = s[1]; c22 = s[2];
  }
  src[o] = x; src[o + 1] = y; src[o + 2] = z;
  src[o + 3] = c00; src[o + 4] = c01; src[o + 5] = c02;
  src[o + 6] = c11; src[o + 7] = c12; src[o + 8] = c22;
  src[o + 9] = r; src[o + 10] = g; src[o + 11] = b; src[o + 12] = opacity;
  return count++;
}

// Fuzzy ellipsoid cluster — the basic "brushstroke" of the whole scene.
function addBlob(cx, cy, cz, rx, ry, rz, n, color, opts = {}) {
  const [r, g, b] = color;
  const jitter = opts.jitter ?? 0.35;
  const size = opts.size ?? 0.16;
  const alpha = opts.alpha ?? 0.55;
  const glow = opts.glow ?? 0;
  const first = count;
  for (let i = 0; i < n; i++) {
    // sample roughly on/inside the ellipsoid shell
    const u = rng() * TAU, v = Math.acos(2 * rng() - 1);
    const rr = 0.55 + 0.45 * Math.cbrt(rng());
    const x = cx + Math.sin(v) * Math.cos(u) * rx * rr;
    const y = cy + Math.cos(v) * ry * rr;
    const z = cz + Math.sin(v) * Math.sin(u) * rz * rr;
    const s = size * (0.6 + rng() * 0.8) * Math.min(rx, Math.min(ry, rz));
    const R = rotYXZ(rng() * TAU, rng() * TAU, rng() * TAU);
    const br = 1 - jitter / 2 + rng() * jitter + glow * rng();
    addSplat(x, y, z, s * (0.7 + rng()), s * (0.7 + rng()), s * (0.7 + rng()), R,
      Math.min(1.5, r * br), Math.min(1.5, g * br), Math.min(1.5, b * br),
      alpha * (0.7 + rng() * 0.5));
  }
  return [first, count];
}

// ===========================================================================
// SCENE — the Memorial Garden
// ===========================================================================
const C = {
  gold: hexRGB('#d4a050'), goldHi: hexRGB('#f0c878'),
  nat: hexRGB('#50b8d8'), mar: hexRGB('#58b868'),
  any: hexRGB('#d88848'), olg: hexRGB('#c8a040'),
};

// --- Ground: a mossy disc with two crossing gold-lit avenues -----------------
{
  const groundA = hexRGB('#16201a'), groundB = hexRGB('#1a2236');
  const pathC = hexRGB('#33291a');
  for (let i = 0; i < 6000; i++) {
    const a = rng() * TAU;
    const d = Math.sqrt(rng()) * 40;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const onPath = Math.min(Math.abs(x), Math.abs(z)) < 1.6 && d > 2.5;
    const t = rng();
    let r, g, b;
    if (onPath) { [r, g, b] = pathC; }
    else {
      r = groundA[0] * (1 - t) + groundB[0] * t;
      g = groundA[1] * (1 - t) + groundB[1] * t;
      b = groundA[2] * (1 - t) + groundB[2] * t;
    }
    const br = 0.5 + rng() * rng() * 2.2; // mottled — most dark, a few bright
    const s = 0.28 + rng() * 0.55;
    addSplat(x, 0.02 + rng() * 0.06, z, s, 0.05, s * (0.6 + rng() * 0.8),
      rotYXZ(rng() * TAU, 0, 0), r * br, g * br, b * br, 0.5 + rng() * 0.35);
  }
  // scattered gold flecks — fireflies frozen in the reconstruction
  for (let i = 0; i < 220; i++) {
    const a = rng() * TAU, d = 3 + Math.sqrt(rng()) * 34;
    addSplat(Math.cos(a) * d, 0.1 + rng() * 0.5, Math.sin(a) * d,
      0.05, 0.05, 0.05, null,
      C.goldHi[0] * 1.4, C.goldHi[1] * 1.35, C.goldHi[2] * 1.2, 0.65 + rng() * 0.35);
  }
}

// --- Sky: nebula dome + stars ------------------------------------------------
{
  const palette = ['#d4a050', '#50b8d8', '#58b868', '#d88848', '#7848c8', '#4888c8'];
  for (let i = 0; i < 320; i++) {
    const a = rng() * TAU, el = 0.15 + rng() * 1.2; // elevation, kept off the horizon
    const R0 = 170 + rng() * 50;
    const y = Math.sin(el) * R0 * 0.55 + 8;
    const h = Math.cos(el) * R0;
    const s = 14 + rng() * 18;
    const [r, g, b] = hexRGB(palette[(rng() * palette.length) | 0]);
    addSplat(Math.cos(a) * h, y, Math.sin(a) * h, s, s * 0.6, s, null,
      r, g, b, 0.014 + rng() * 0.024);
  }
  for (let i = 0; i < 1400; i++) {
    const a = rng() * TAU, el = rng() * 1.45;
    const R0 = 170 + rng() * 40;
    const y = Math.sin(el) * R0 * 0.7 + 4;
    const h = Math.cos(el) * R0;
    const tw = 0.35 + rng() * 0.65;
    const gold = rng() < 0.2;
    addSplat(Math.cos(a) * h, y, Math.sin(a) * h, 0.5, 0.5, 0.5, null,
      gold ? 1.3 : tw, gold ? 1.05 : tw, gold ? 0.5 : tw * 1.1, 0.5 + rng() * 0.5);
  }
}

// --- Trees: eight sentinels on the outer ring --------------------------------
const obstacles = []; // {x, z, r} — cheap radial collision
{
  const trunkC = hexRGB('#3a2c20'), leafA = hexRGB('#1e3a26'), leafB = hexRGB('#2a4a20');
  for (let t = 0; t < 8; t++) {
    const a = (t / 8) * TAU + 0.39;
    const d = 27 + rng() * 4;
    const tx = Math.cos(a) * d, tz = Math.sin(a) * d;
    obstacles.push({ x: tx, z: tz, r: 0.9 });
    const h = 2.6 + rng() * 1.2;
    for (let i = 0; i < 160; i++) {
      const y = rng() * h;
      const lean = y * 0.08;
      addSplat(tx + (rng() - 0.5) * 0.3 + lean, y, tz + (rng() - 0.5) * 0.3,
        0.14, 0.3, 0.14, rotYXZ(rng() * TAU, (rng() - 0.5) * 0.4, 0),
        trunkC[0] * (0.7 + rng() * 0.6), trunkC[1] * (0.7 + rng() * 0.6), trunkC[2] * (0.7 + rng() * 0.6),
        0.75);
    }
    const blobs = 3 + ((rng() * 3) | 0);
    for (let bIdx = 0; bIdx < blobs; bIdx++) {
      const bx = tx + (rng() - 0.5) * 1.8 + h * 0.08;
      const by = h + 0.4 + rng() * 1.4;
      const bz = tz + (rng() - 0.5) * 1.8;
      const rr = 0.9 + rng() * 0.9;
      const mixT = rng();
      addBlob(bx, by, bz, rr, rr * 0.8, rr, 130, [
        leafA[0] * (1 - mixT) + leafB[0] * mixT,
        leafA[1] * (1 - mixT) + leafB[1] * mixT,
        leafA[2] * (1 - mixT) + leafB[2] * mixT,
      ], { size: 0.22, alpha: 0.5, glow: 0.15 });
    }
  }
}

// --- The four Sparrow statues — women of light on stone plinths --------------
function buildStatue(cx, cz, faceAngle, color) {
  obstacles.push({ x: cx, z: cz, r: 1.3 });
  const stone = hexRGB('#565866');
  // plinth
  for (let i = 0; i < 260; i++) {
    const x = cx + (rng() - 0.5) * 1.5, z = cz + (rng() - 0.5) * 1.5;
    const y = rng() * 0.85;
    addSplat(x, y, z, 0.2, 0.14, 0.2, rotYXZ(rng() * TAU, 0, 0),
      stone[0] * (0.6 + rng() * 0.7), stone[1] * (0.6 + rng() * 0.7), stone[2] * (0.6 + rng() * 0.7), 0.7);
  }
  // body — a standing figure, slightly luminous
  addBlob(cx, 1.75, cz, 0.36, 0.85, 0.3, 420, color, { size: 0.14, alpha: 0.72, glow: 0.55 });
  addBlob(cx, 2.75, cz, 0.23, 0.26, 0.23, 190, color, { size: 0.16, alpha: 0.75, glow: 0.65 }); // head
  // skirt flare
  for (let i = 0; i < 170; i++) {
    const a = rng() * TAU, rr = 0.3 + rng() * 0.35;
    const y = 0.9 + rng() * 0.5;
    addSplat(cx + Math.cos(a) * rr * (1.6 - y * 0.6), y, cz + Math.sin(a) * rr * (1.6 - y * 0.6),
      0.1, 0.22, 0.1, rotYXZ(a, 0.4, 0),
      color[0], color[1], color[2], 0.4);
  }
  // wings — two arcs of stretched splats, the series emblem
  for (const side of [-1, 1]) {
    for (let i = 0; i < 190; i++) {
      const t = rng();
      const spread = t * 2.1;
      const lift = Math.sin(t * Math.PI * 0.85) * 1.15;
      const sweep = faceAngle + side * (0.6 + t * 0.9);
      const wx = cx + Math.cos(sweep) * spread;
      const wz = cz + Math.sin(sweep) * spread;
      const wy = 2.15 + lift + (rng() - 0.5) * 0.15;
      // tangent along the wing arc
      const dx = Math.cos(sweep) - spread * Math.sin(sweep) * side * 0.5;
      const dz = Math.sin(sweep) + spread * Math.cos(sweep) * side * 0.5;
      const B = basisAlongX(dx, 0.4 * Math.cos(t * Math.PI * 0.85), dz);
      const glow = 1.0 + rng() * 0.7;
      addSplat(wx, wy, wz, 0.26 + t * 0.1, 0.05, 0.09, B,
        Math.min(1.5, color[0] * glow), Math.min(1.5, color[1] * glow), Math.min(1.5, color[2] * glow),
        0.68 * (1 - t * 0.4));
    }
  }
  // halo mote above the head
  addSplat(cx, 3.35, cz, 0.12, 0.12, 0.12, null,
    Math.min(1.5, color[0] * 1.5), Math.min(1.5, color[1] * 1.5), Math.min(1.5, color[2] * 1.5), 0.9);
}
buildStatue(Math.cos(TAU * 0.125) * 12, Math.sin(TAU * 0.125) * 12, TAU * 0.125 + Math.PI, C.nat);
buildStatue(Math.cos(TAU * 0.375) * 12, Math.sin(TAU * 0.375) * 12, TAU * 0.375 + Math.PI, C.mar);
buildStatue(Math.cos(TAU * 0.625) * 12, Math.sin(TAU * 0.625) * 12, TAU * 0.625 + Math.PI, C.any);
buildStatue(Math.cos(TAU * 0.875) * 12, Math.sin(TAU * 0.875) * 12, TAU * 0.875 + Math.PI, C.olg);

// --- Central obelisk + beacon ------------------------------------------------
let beaconRange = [0, 0];
{
  obstacles.push({ x: 0, z: 0, r: 1.7 });
  const stone = hexRGB('#484a58');
  for (let i = 0; i < 900; i++) {
    const y = rng() * 6;
    const w = 0.85 * (1 - y / 7.5);
    addSplat((rng() - 0.5) * 2 * w, y, (rng() - 0.5) * 2 * w,
      0.16, 0.3, 0.16, rotYXZ(rng() * TAU, 0, 0),
      stone[0] * (0.55 + rng() * 0.7 + y * 0.04),
      stone[1] * (0.55 + rng() * 0.7 + y * 0.04),
      stone[2] * (0.55 + rng() * 0.7 + y * 0.05), 0.75);
  }
  // beacon — grows brighter with every recovered memory (animated group)
  const first = count;
  addBlob(0, 6.6, 0, 0.55, 0.55, 0.55, 260, C.goldHi, { size: 0.3, alpha: 0.5, glow: 0.6 });
  for (let i = 0; i < 240; i++) { // orbiting ring
    const a = rng() * TAU;
    const rr = 1.1 + rng() * 0.25;
    addSplat(Math.cos(a) * rr, 6.6 + (rng() - 0.5) * 0.3, Math.sin(a) * rr,
      0.22, 0.045, 0.06, basisAlongX(-Math.sin(a), 0, Math.cos(a)),
      C.gold[0] * 1.3, C.gold[1] * 1.3, C.gold[2] * 1.2, 0.55);
  }
  beaconRange = [first, count];
}
const beaconBaseA = new Float32Array(beaconRange[1] - beaconRange[0]);
for (let i = beaconRange[0]; i < beaconRange[1]; i++) beaconBaseA[i - beaconRange[0]] = src[i * FLOATS + 12];

// --- Eight memory shards — one per season/era --------------------------------
const ERA_COLORS = ['#8b7355', '#c84848', '#7848c8', '#4888c8', '#48c888', '#4878c8', '#3060a0', '#d4a050'];
const shards = []; // {x, z, range:[a,b], baseY:Float32Array, phase, collected, fade}
{
  for (let sIdx = 0; sIdx < 8; sIdx++) {
    const a = (sIdx / 8) * TAU + 0.18;
    const d = 17 + (sIdx % 3) * 3.4;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const col = hexRGB(ERA_COLORS[sIdx]);
    const first = count;
    // crystalline core
    for (let i = 0; i < 70; i++) {
      const yy = 1.1 + (rng() - 0.5) * 0.8;
      addSplat(x + (rng() - 0.5) * 0.35, yy, z + (rng() - 0.5) * 0.35,
        0.06 + rng() * 0.1, 0.16 + rng() * 0.2, 0.06 + rng() * 0.1,
        rotYXZ(rng() * TAU, (rng() - 0.5) * 0.6, (rng() - 0.5) * 0.6),
        Math.min(1.5, col[0] * 1.35), Math.min(1.5, col[1] * 1.35), Math.min(1.5, col[2] * 1.35),
        0.75);
    }
    // orbit sparks
    for (let i = 0; i < 40; i++) {
      const oa = rng() * TAU, or_ = 0.5 + rng() * 0.4;
      addSplat(x + Math.cos(oa) * or_, 1.1 + (rng() - 0.5) * 1.1, z + Math.sin(oa) * or_,
        0.045, 0.045, 0.045, null, col[0] * 1.4, col[1] * 1.4, col[2] * 1.4, 0.8);
    }
    // light pillar — visible across the garden, fades with the shard
    for (let i = 0; i < 30; i++) {
      const py = 1.6 + (i / 30) * 6.5;
      addSplat(x + (rng() - 0.5) * 0.12, py, z + (rng() - 0.5) * 0.12,
        0.09, 0.55, 0.09, null,
        Math.min(1.5, col[0] * 1.3), Math.min(1.5, col[1] * 1.3), Math.min(1.5, col[2] * 1.3),
        0.14 * (1 - i / 34));
    }
    const range = [first, count];
    const baseY = new Float32Array(range[1] - range[0]);
    const baseA = new Float32Array(range[1] - range[0]);
    for (let i = range[0]; i < range[1]; i++) {
      baseY[i - range[0]] = src[i * FLOATS + 1];
      baseA[i - range[0]] = src[i * FLOATS + 12];
    }
    shards.push({ x, z, range, baseY, baseA, phase: sIdx * 0.9, collected: false, fade: 1 });
  }
}

// --- Dust motes (animated drift) ---------------------------------------------
const motes = { range: [0, 0], vel: null };
{
  const first = count;
  for (let i = 0; i < 500; i++) {
    const a = rng() * TAU, d = Math.sqrt(rng()) * 34;
    addSplat(Math.cos(a) * d, 0.3 + rng() * 5, Math.sin(a) * d,
      0.035, 0.035, 0.035, null, 1.1, 0.95, 0.6, 0.25 + rng() * 0.3);
  }
  motes.range = [first, count];
  const n = count - first;
  motes.vel = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    motes.vel[i * 3] = (rng() - 0.5) * 0.004;
    motes.vel[i * 3 + 1] = 0.001 + rng() * 0.004;
    motes.vel[i * 3 + 2] = (rng() - 0.5) * 0.004;
  }
}

// --- The murmuration — 1800 golden sparrows, hidden until the finale ---------
const birds = { range: [0, 0], phase: null, alpha: 0 };
{
  const first = count;
  const n = 1800;
  birds.phase = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    birds.phase[i * 4] = rng() * TAU;        // orbit offset
    birds.phase[i * 4 + 1] = rng() * TAU;    // radius wobble
    birds.phase[i * 4 + 2] = rng() * TAU;    // height wobble
    birds.phase[i * 4 + 3] = 0.6 + rng();    // speed factor
    const B = basisAlongX(rng() - 0.5, (rng() - 0.5) * 0.3, rng() - 0.5);
    addSplat(0, 8, 0, 0.16, 0.03, 0.07, B,
      C.goldHi[0] * 1.2, C.goldHi[1] * 1.15, C.goldHi[2], 0.0);
  }
  birds.range = [first, count];
}

console.info(`[Sparrows] Afterglow scene: ${count} gaussian splats`);

// ===========================================================================
// RENDERER — WebGL2 instanced splatting
// ===========================================================================
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });

function fatal(msg) {
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#d4a050;background:#030305;font:14px Inter,sans-serif;text-align:center;padding:20px;z-index:50;';
  d.textContent = msg;
  frame.appendChild(d);
  throw new Error(msg);
}
if (!gl) fatal('This epilogue is rendered with 3D Gaussian Splatting and needs WebGL2. Please try a modern browser.');

const VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;   // quad, ±2 (units of σ·√2)
layout(location=1) in vec3 iPos;
layout(location=2) in vec3 iCovA;     // c00 c01 c02
layout(location=3) in vec3 iCovB;     // c11 c12 c22
layout(location=4) in vec4 iColor;    // rgb, opacity
uniform mat4 uView;
uniform mat4 uProj;
uniform vec2 uViewport;
uniform float uFocal;
out vec2 vC;
out vec4 vColor;
void main() {
  vec4 cam = uView * vec4(iPos, 1.0);
  float z1 = -cam.z;                  // camera looks down -Z; z1 > 0 in front
  if (z1 < 0.2) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }

  mat3 Vrk = mat3(
    iCovA.x, iCovA.y, iCovA.z,
    iCovA.y, iCovB.x, iCovB.y,
    iCovA.z, iCovB.y, iCovB.z);

  float iz = 1.0 / z1;
  // Jacobian of the perspective projection (columns; third row unused)
  mat3 J = mat3(
    uFocal * iz, 0.0, 0.0,
    0.0, uFocal * iz, 0.0,
    uFocal * cam.x * iz * iz, uFocal * cam.y * iz * iz, 0.0);
  mat3 W = mat3(uView);               // world→camera rotation
  mat3 A = J * W;
  mat3 cov = A * Vrk * transpose(A);

  float c00 = cov[0][0] + 0.3;
  float c11 = cov[1][1] + 0.3;
  float c01 = cov[0][1];

  float mid = 0.5 * (c00 + c11);
  float rad = length(vec2(0.5 * (c00 - c11), c01));
  float l1 = mid + rad;
  float l2 = max(mid - rad, 0.05);
  vec2 ev = (abs(c01) < 1e-6)
    ? (c00 >= c11 ? vec2(1.0, 0.0) : vec2(0.0, 1.0))
    : normalize(vec2(c01, l1 - c00));
  vec2 ax1 = min(sqrt(2.0 * l1), 1024.0) * ev;
  vec2 ax2 = min(sqrt(2.0 * l2), 1024.0) * vec2(ev.y, -ev.x);

  vec4 clip = uProj * cam;
  vec2 ndc = clip.xy / clip.w;
  gl_Position = vec4(
    ndc + (aCorner.x * ax1 + aCorner.y * ax2) * 2.0 / uViewport,
    0.0, 1.0);
  vC = aCorner;
  vColor = iColor;
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vC;
in vec4 vColor;
out vec4 frag;
void main() {
  float A = -dot(vC, vC);
  if (A < -4.0) discard;
  float a = exp(A) * vColor.a;
  frag = vec4(vColor.rgb * a, a);
}`;

function compile(type, srcCode) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, srcCode);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) fatal('Shader error: ' + gl.getShaderInfoLog(sh));
  return sh;
}
const prog = gl.createProgram();
gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) fatal('Link error: ' + gl.getProgramInfoLog(prog));
gl.useProgram(prog);

const uView = gl.getUniformLocation(prog, 'uView');
const uProj = gl.getUniformLocation(prog, 'uProj');
const uViewport = gl.getUniformLocation(prog, 'uViewport');
const uFocal = gl.getUniformLocation(prog, 'uFocal');

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const cornerBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-2, -2, 2, -2, -2, 2, 2, 2]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

const STRIDE = FLOATS * 4;
const instBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
gl.bufferData(gl.ARRAY_BUFFER, count * STRIDE, gl.DYNAMIC_DRAW);
[[1, 3, 0], [2, 3, 12], [3, 3, 24], [4, 4, 36]].forEach(([loc, size, off]) => {
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE, off);
  gl.vertexAttribDivisor(loc, 1);
});

gl.disable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied, back-to-front
gl.clearColor(0.012, 0.012, 0.02, 1);

// --- Painter's sort: counting sort on quantized view depth, far → near ------
const BUCKETS = 4096;
const depths = new Float32Array(count);
const bucketOf = new Uint16Array(count);
const counts = new Uint32Array(BUCKETS);
const starts = new Uint32Array(BUCKETS);
const order = new Uint32Array(count);
const sorted = new Float32Array(count * FLOATS);

function sortAndUpload(view) {
  const m2 = view[2], m6 = view[6], m10 = view[10], m14 = view[14];
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < count; i++) {
    const o = i * FLOATS;
    const d = -(m2 * src[o] + m6 * src[o + 1] + m10 * src[o + 2] + m14);
    depths[i] = d;
    if (d < mn) mn = d;
    if (d > mx) mx = d;
  }
  const scale = (BUCKETS - 1) / ((mx - mn) || 1);
  counts.fill(0);
  for (let i = 0; i < count; i++) {
    const b = (BUCKETS - 1 - ((depths[i] - mn) * scale)) | 0; // far first
    bucketOf[i] = b;
    counts[b]++;
  }
  let acc = 0;
  for (let b = 0; b < BUCKETS; b++) { starts[b] = acc; acc += counts[b]; }
  for (let i = 0; i < count; i++) order[starts[bucketOf[i]]++] = i;
  for (let k = 0; k < count; k++) {
    const si = order[k] * FLOATS, di = k * FLOATS;
    for (let f = 0; f < FLOATS; f++) sorted[di + f] = src[si + f];
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, sorted);
}

// --- Camera ------------------------------------------------------------------
const FOV = 68 * Math.PI / 180;
const player = { x: 0, y: 1.7, z: 24, yaw: 0, pitch: -0.03 };
const proj = new Float32Array(16);
const view = new Float32Array(16);

function updateProjection() {
  const w = canvas.width, h = canvas.height;
  const f = 1 / Math.tan(FOV / 2);
  const near = 0.1, far = 400;
  proj.fill(0);
  proj[0] = f * h / w;
  proj[5] = f;
  proj[10] = (far + near) / (near - far);
  proj[11] = -1;
  proj[14] = (2 * far * near) / (near - far);
  gl.uniformMatrix4fv(uProj, false, proj);
  gl.uniform2f(uViewport, w, h);
  gl.uniform1f(uFocal, (h / 2) * f);
  gl.viewport(0, 0, w, h);
}

function updateView(bobY) {
  const cy = Math.cos(player.yaw), sy = Math.sin(player.yaw);
  const cp = Math.cos(player.pitch), sp = Math.sin(player.pitch);
  // forward (view dir), right, up — right-handed, looking down -Z at yaw=0...
  const fx = sy * cp, fy = sp, fz = -cy * cp;
  const rx = cy, ry = 0, rz = sy;
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  const ex = player.x, ey = player.y + bobY, ez = player.z;
  view[0] = rx; view[4] = ry; view[8] = rz; view[12] = -(rx * ex + ry * ey + rz * ez);
  view[1] = ux; view[5] = uy; view[9] = uz; view[13] = -(ux * ex + uy * ey + uz * ez);
  view[2] = -fx; view[6] = -fy; view[10] = -fz; view[14] = (fx * ex + fy * ey + fz * ez);
  view[3] = 0; view[7] = 0; view[11] = 0; view[15] = 1;
  gl.uniformMatrix4fv(uView, false, view);
}

function resize() {
  if (MODE === 'mobile') {
    const dpr = Math.min(1.6, devicePixelRatio || 1);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
  }
  updateProjection();
}
addEventListener('resize', resize, { passive: true });
resize();

// ===========================================================================
// AUDIO — same tiny synth voice as the rest of the series
// ===========================================================================
let ax = null, drone = null;
function initAudio() {
  if (ax) return;
  ax = new (window.AudioContext || window.webkitAudioContext)();
  // soft memorial drone
  const g = ax.createGain(); g.gain.value = 0.012; g.connect(ax.destination);
  [55, 82.5, 110.3].forEach((f) => {
    const o = ax.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    o.connect(g); o.start();
  });
  drone = g;
}
function sn(f, d, type = 'sine', v = 0.05) {
  if (!ax) return;
  const o = ax.createOscillator(), g = ax.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(v, ax.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ax.currentTime + d);
  o.connect(g); g.connect(ax.destination);
  o.start(); o.stop(ax.currentTime + d);
}
const SFX = {
  tick: () => sn(680, 0.02, 'sine', 0.018),
  confirm: () => { sn(480, 0.07, 'sine', 0.05); sn(620, 0.09, 'sine', 0.04); },
  collect: () => [392, 523, 659, 784].forEach((f, i) => setTimeout(() => sn(f, 0.22, 'sine', 0.06), i * 70)),
  finale: () => [262, 330, 392, 523, 659, 784].forEach((f, i) => setTimeout(() => sn(f, 0.5, 'sine', 0.06), i * 130)),
};

// ===========================================================================
// UI OVERLAYS (DOM) — title, HUD, dialogue, prompt, end card
// ===========================================================================
const ui = document.createElement('div');
ui.style.cssText = 'position:absolute;inset:0;pointer-events:none;font-family:Inter,sans-serif;overflow:hidden;';
frame.appendChild(ui);

function el(css, html) {
  const d = document.createElement('div');
  d.style.cssText = css;
  if (html) d.innerHTML = html;
  ui.appendChild(d);
  return d;
}

const GOLD = '#d4a050', GOLD_HI = '#f0c878';
const hud = el(`position:absolute;top:12px;left:14px;color:${GOLD};font:700 12px Inter,sans-serif;letter-spacing:2px;text-shadow:0 0 8px rgba(0,0,0,0.8);`);
const prompt = el(`position:absolute;left:50%;bottom:18%;transform:translateX(-50%);color:${GOLD_HI};font:700 13px Inter,sans-serif;letter-spacing:3px;text-shadow:0 0 12px rgba(212,160,80,0.6);display:none;`);
const dlgBox = el(`position:absolute;left:50%;bottom:24px;transform:translateX(-50%);width:min(620px,86%);background:rgba(3,3,5,0.86);border:1px solid ${GOLD};padding:12px 18px 14px;display:none;`);
const dlgSpeaker = document.createElement('div');
dlgSpeaker.style.cssText = 'font:700 11px Inter,sans-serif;letter-spacing:2px;margin-bottom:6px;';
const dlgText = document.createElement('div');
dlgText.style.cssText = 'color:#f0f0f8;font:13px/1.55 Inter,sans-serif;min-height:2.6em;';
const dlgMore = document.createElement('div');
dlgMore.style.cssText = `color:${GOLD};font:10px Inter,sans-serif;text-align:right;letter-spacing:1px;`;
dlgBox.append(dlgSpeaker, dlgText, dlgMore);

const vignette = el('position:absolute;inset:0;background:radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%);');
void vignette;

const title = el(`position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(3,3,5,0.72);text-align:center;pointer-events:auto;cursor:pointer;padding:20px;`);
title.innerHTML = `
  <div style="font:700 11px Inter,sans-serif;letter-spacing:6px;color:#858595;margin-bottom:14px;">THE SPARROWS &nbsp;•&nbsp; EPILOGUE</div>
  <div style="font-family:'Bebas Neue',Inter,sans-serif;font-size:clamp(42px,9vw,72px);letter-spacing:10px;background:linear-gradient(180deg,${GOLD_HI},${GOLD} 55%,#a07030);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">AFTERGLOW</div>
  <div style="font:11px Inter,sans-serif;color:#858595;letter-spacing:2px;margin:12px 0 4px;">NEURAL RENDERING ERA • 2023+</div>
  <div style="font:11px Inter,sans-serif;color:#606070;max-width:440px;line-height:1.7;">The garden is a reconstruction — <b style="color:${GOLD}">${count.toLocaleString()}</b> three-dimensional gaussian splats, projected and blended in real time. Eight memories are scattered among the light. Recover them.</div>
  <div id="splat-start" style="margin-top:26px;padding:12px 34px;border:1px solid ${GOLD};color:${GOLD_HI};font:700 12px Inter,sans-serif;letter-spacing:4px;background:rgba(212,160,80,0.08);">ENTER THE GARDEN</div>
  <div style="margin-top:14px;font:9px Inter,sans-serif;color:#505060;letter-spacing:2px;">${MODE === 'mobile' ? 'LEFT: MOVE • RIGHT: LOOK • BUTTON: RECOVER' : 'WASD MOVE • MOUSE LOOK • SHIFT SPRINT • E RECOVER'}</div>
  <div id="splat-done" style="margin-top:10px;font:9px Inter,sans-serif;color:#48b860;letter-spacing:2px;display:none;">✓ EPILOGUE COMPLETE</div>`;
if (localStorage.getItem('sparrows:epilogue') === 'done') title.querySelector('#splat-done').style.display = 'block';

const endCard = el(`position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(3,3,5,0.55);text-align:center;pointer-events:auto;padding:20px;`);
endCard.innerHTML = `
  <div style="font-family:'Bebas Neue',Inter,sans-serif;font-size:clamp(34px,7vw,56px);letter-spacing:8px;color:${GOLD_HI};text-shadow:0 0 30px rgba(212,160,80,0.5);">THE SPARROWS</div>
  <div style="font:700 12px Inter,sans-serif;letter-spacing:6px;color:#e8e8f0;margin:6px 0 16px;">FOREVER</div>
  <div style="font:11px Inter,sans-serif;color:#a0a0a8;max-width:420px;line-height:1.8;">Eight seasons. Eight eras of the medium — from 128 colours of an Atari palette to a sky full of gaussians. Thank you for walking with them.</div>
  <div style="display:flex;gap:12px;margin-top:24px;">
    <a href="../../index.html" style="padding:10px 22px;border:1px solid ${GOLD};color:${GOLD_HI};font:700 11px Inter,sans-serif;letter-spacing:3px;text-decoration:none;background:rgba(212,160,80,0.1);">ALL SEASONS</a>
    <div id="splat-stay" style="padding:10px 22px;border:1px solid #3a3a4a;color:#a0a0a8;font:700 11px Inter,sans-serif;letter-spacing:3px;cursor:pointer;">KEEP WALKING</div>
  </div>`;
endCard.querySelector('#splat-stay').addEventListener('click', () => { endCard.style.display = 'none'; lockPointer(); });

// ===========================================================================
// DIALOGUE
// ===========================================================================
const SPEAKER_COLOR = { SYS: GOLD, NAT: '#50b8d8', MAR: '#58b868', ANY: '#d88848', OLG: '#c8a040' };
const SPEAKER_NAME = { SYS: 'SYSTEM', NAT: 'NATASHA — CIPHER', MAR: 'MARIA — VENOM', ANY: 'ANYA — HAWK', OLG: 'OLGA — ORACLE' };

const INTRO = [
  ['SYS', 'MEMORIAL GARDEN — NEURAL RECONSTRUCTION v9.0'],
  ['SYS', `${count.toLocaleString()} GAUSSIAN SPLATS • SOURCE: SHARED MEMORY`],
  ['NAT', 'Five years of peace. We built this place out of light.'],
  ['MAR', 'Eight memories are scattered in the garden. Walk. Remember.'],
];
const SHARD_LINES = [
  [['SYS', 'MEMORY 01/08 — THE AWAKENING • ATARI 2600'], ['NAT', 'Four girls. One gray room. We were eight pixels tall, and they still feared us.']],
  [['SYS', 'MEMORY 02/08 — TRAINING DAY • NES'], ['MAR', 'Every scar was a lesson. Every lesson was a sister.']],
  [['SYS', 'MEMORY 03/08 — THE MISSION BEGINS • SNES / GENESIS'], ['ANY', 'Our first real mission. The streets remember what the reports erased.']],
  [['SYS', 'MEMORY 04/08 — BONDS TESTED • PS1 / N64'], ['OLG', 'The betrayal. Even now, I check the shadows twice.']],
  [['SYS', 'MEMORY 05/08 — REVELATIONS • PS2 / XBOX'], ['NAT', 'Going rogue was the first order we ever gave ourselves.']],
  [['SYS', 'MEMORY 06/08 — SHADOWS RISING • PS3 / 360'], ['MAR', 'The Collective fell in high definition. We carried each other out of the smoke.']],
  [['SYS', 'MEMORY 07/08 — SHOWDOWN • PS4 / XB1'], ['ANY', 'Viper, at the end, looked almost relieved. Aim with memory. Fire with mercy.']],
  [['SYS', 'MEMORY 08/08 — RESOLUTION • CURRENT GEN'], ['OLG', 'Phoenix was our mirror. We broke it — and finally saw ourselves.']],
];
const FINALE = [
  ['SYS', 'RECONSTRUCTION COMPLETE — 08/08'],
  ['NAT', 'Look up.'],
  ['ANY', 'Sparrows.'],
  ['OLG', 'Not weapons. Not ghosts. Just birds.'],
  ['MAR', 'Free.'],
  ['SYS', 'FOUR GIRLS WERE TAKEN. FOUR WOMEN WALKED FREE.'],
  ['SYS', 'THE SPARROWS — FOREVER'],
];

let dlgQueue = [], dlgLine = null, dlgChars = 0, dlgAccum = 0, dlgDone = null;
function say(lines, onDone) {
  dlgQueue = lines.slice();
  dlgDone = onDone || null;
  nextLine();
}
function nextLine() {
  if (!dlgQueue.length) {
    dlgLine = null;
    dlgBox.style.display = 'none';
    const cb = dlgDone; dlgDone = null;
    if (cb) cb();
    return;
  }
  dlgLine = dlgQueue.shift();
  dlgChars = 0;
  dlgAccum = 0;
  dlgSpeaker.textContent = SPEAKER_NAME[dlgLine[0]] || dlgLine[0];
  dlgSpeaker.style.color = SPEAKER_COLOR[dlgLine[0]] || '#858595';
  dlgText.textContent = '';
  dlgMore.textContent = '';
  dlgBox.style.display = 'block';
}
function advanceDialogue() {
  if (!dlgLine) return;
  if (dlgChars < dlgLine[1].length) { dlgChars = dlgLine[1].length; dlgText.textContent = dlgLine[1]; dlgMore.textContent = '▼'; }
  else nextLine();
}

// ===========================================================================
// INPUT
// ===========================================================================
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
    if (state === 'play' && dlgLine) { advanceDialogue(); e.preventDefault(); }
    else if (state === 'play' && e.code === 'KeyE') tryInteract();
  }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

function lockPointer() {
  if (MODE === 'desktop' && state === 'play') canvas.requestPointerLock?.();
}
canvas.addEventListener('click', () => {
  if (state !== 'play') return;
  if (dlgLine && document.pointerLockElement) { advanceDialogue(); return; }
  lockPointer();
});
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  player.yaw += e.movementX * 0.0024;
  player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - e.movementY * 0.0024));
});

// Touch controls (built-in on mobile.html; index.html gets the shared joystick
// from enhance.js, which synthesizes arrow-key events we already listen to).
const touch = { moveId: -1, lookId: -1, mx: 0, my: 0, ox: 0, oy: 0, lx: 0, ly: 0 };
if (MODE === 'mobile') {
  const stick = el(`position:absolute;left:26px;bottom:26px;width:110px;height:110px;border:1px solid rgba(212,160,80,0.45);border-radius:50%;pointer-events:none;display:none;`);
  const nub = el(`position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(212,160,80,0.35);pointer-events:none;display:none;`);
  const act = el(`position:absolute;right:26px;bottom:34px;width:74px;height:74px;border-radius:50%;border:2px solid rgba(212,160,80,0.6);background:rgba(212,160,80,0.2);color:#fff;font:700 11px Inter,sans-serif;letter-spacing:1px;display:flex;align-items:center;justify-content:center;pointer-events:auto;`, 'ACT');
  act.addEventListener('touchstart', (e) => { e.preventDefault(); if (dlgLine) advanceDialogue(); else tryInteract(); });

  canvas.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth / 2 && touch.moveId < 0) {
        touch.moveId = t.identifier; touch.ox = t.clientX; touch.oy = t.clientY; touch.mx = 0; touch.my = 0;
        stick.style.display = 'block'; nub.style.display = 'block';
        stick.style.left = (t.clientX - 55) + 'px'; stick.style.top = (t.clientY - 55) + 'px';
        stick.style.bottom = 'auto';
        nub.style.left = (t.clientX - 22) + 'px'; nub.style.top = (t.clientY - 22) + 'px';
      } else if (touch.lookId < 0) {
        touch.lookId = t.identifier; touch.lx = t.clientX; touch.ly = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touch.moveId) {
        const dx = t.clientX - touch.ox, dy = t.clientY - touch.oy;
        const l = Math.hypot(dx, dy) || 1, cl = Math.min(l, 48);
        touch.mx = (dx / l) * (cl / 48); touch.my = (dy / l) * (cl / 48);
        nub.style.left = (touch.ox + (dx / l) * cl - 22) + 'px';
        nub.style.top = (touch.oy + (dy / l) * cl - 22) + 'px';
      } else if (t.identifier === touch.lookId) {
        player.yaw += (t.clientX - touch.lx) * 0.006;
        player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - (t.clientY - touch.ly) * 0.006));
        touch.lx = t.clientX; touch.ly = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touch.moveId) { touch.moveId = -1; touch.mx = 0; touch.my = 0; stick.style.display = 'none'; nub.style.display = 'none'; }
      if (t.identifier === touch.lookId) touch.lookId = -1;
    }
  };
  canvas.addEventListener('touchend', endTouch);
  canvas.addEventListener('touchcancel', endTouch);
}

// ===========================================================================
// GAME STATE
// ===========================================================================
let state = 'title'; // 'title' | 'play' | 'end'
let collectedCount = 0;
let finaleStarted = false;
let nearShard = -1;

title.addEventListener('click', () => {
  if (state !== 'title') return;
  state = 'play';
  title.style.display = 'none';
  initAudio();
  SFX.confirm();
  lockPointer();
  say(INTRO);
  updateHud();
});

function updateHud() {
  hud.innerHTML = `MEMORIES <span style="color:${GOLD_HI}">${collectedCount}/8</span>`;
}

function tryInteract() {
  if (dlgLine || nearShard < 0) return;
  const sh = shards[nearShard];
  if (sh.collected) return;
  sh.collected = true;
  collectedCount++;
  updateHud();
  SFX.collect();
  const idx = shards.indexOf(sh);
  say(SHARD_LINES[idx], () => {
    if (collectedCount === 8 && !finaleStarted) startFinale();
  });
  prompt.style.display = 'none';
}

function startFinale() {
  finaleStarted = true;
  SFX.finale();
  say(FINALE, () => {
    state = 'end';
    localStorage.setItem('sparrows:epilogue', 'done');
    try { window.Sparrows?.progress?.set('complete', true); } catch { /* enhance.js optional */ }
    document.exitPointerLock?.();
    endCard.style.display = 'flex';
  });
}

// ===========================================================================
// PER-FRAME ANIMATION of dynamic splat groups (writes into `src`)
// ===========================================================================
function animate(t) {
  // memory shards: bob + pulse; collected shards fade out
  for (const sh of shards) {
    if (sh.collected && sh.fade > 0) sh.fade = Math.max(0, sh.fade - 0.03);
    const bob = Math.sin(t * 1.8 + sh.phase) * 0.14;
    const pulse = 0.78 + 0.22 * Math.sin(t * 3 + sh.phase * 2);
    for (let i = sh.range[0]; i < sh.range[1]; i++) {
      const o = i * FLOATS, li = i - sh.range[0];
      src[o + 1] = sh.baseY[li] + bob;
      src[o + 12] = sh.baseA[li] * pulse * sh.fade;
    }
  }
  // beacon brightens with progress
  const beaconF = 0.3 + (collectedCount / 8) * 0.7 * (0.85 + 0.15 * Math.sin(t * 2.2));
  for (let i = beaconRange[0]; i < beaconRange[1]; i++) {
    src[i * FLOATS + 12] = beaconBaseA[i - beaconRange[0]] * beaconF;
  }
  // dust motes drift
  {
    const [a, b] = motes.range;
    for (let i = a; i < b; i++) {
      const o = i * FLOATS, vi = (i - a) * 3;
      src[o] += motes.vel[vi];
      src[o + 1] += motes.vel[vi + 1];
      src[o + 2] += motes.vel[vi + 2];
      if (src[o + 1] > 6) src[o + 1] = 0.2;
      if (src[o] * src[o] + src[o + 2] * src[o + 2] > 36 * 36) { src[o] *= -0.98; src[o + 2] *= -0.98; }
    }
  }
  // murmuration
  if (finaleStarted && birds.alpha < 0.55) birds.alpha = Math.min(0.55, birds.alpha + 0.004);
  if (birds.alpha > 0) {
    const [a, b] = birds.range;
    for (let i = a; i < b; i++) {
      const o = i * FLOATS, pi = (i - a) * 4;
      const p0 = birds.phase[pi], p1 = birds.phase[pi + 1], p2 = birds.phase[pi + 2], spd = birds.phase[pi + 3];
      const ang = t * 0.22 * spd + p0;
      const rad = 7 + 4.5 * Math.sin(t * 0.13 * spd + p1);
      src[o] = Math.cos(ang) * rad + Math.sin(t * 0.5 + p2) * 1.6;
      src[o + 1] = 8.5 + 3.2 * Math.sin(t * 0.19 * spd + p2) + Math.sin(p1) * 1.5;
      src[o + 2] = Math.sin(ang) * rad + Math.cos(t * 0.47 + p1) * 1.6;
      src[o + 12] = birds.alpha * (0.6 + 0.4 * Math.sin(t * 6 * spd + p0));
    }
  }
}

// ===========================================================================
// MOVEMENT + MAIN LOOP
// ===========================================================================
let last = performance.now();
let walkPhase = 0;

function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  if (state !== 'title') {
    // movement input: WASD/arrows (arrows also fed by enhance.js joystick) + touch stick
    let ix = 0, iz = 0;
    if (keys['KeyW'] || keys['ArrowUp']) iz += 1;
    if (keys['KeyS'] || keys['ArrowDown']) iz -= 1;
    if (keys['KeyA'] || keys['ArrowLeft']) ix -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) ix += 1;
    ix += touch.mx; iz -= touch.my;
    const il = Math.hypot(ix, iz);
    if (il > 1) { ix /= il; iz /= il; }
    const sprint = (keys['ShiftLeft'] || keys['ShiftRight']) ? 1.8 : 1;
    const speed = 4.2 * sprint;
    const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    // forward on the XZ plane
    player.x += (sy * iz + cy * ix) * speed * dt;
    player.z += (-cy * iz + sy * ix) * speed * dt;
    // keep inside the garden + push out of obstacles
    const pd = Math.hypot(player.x, player.z);
    if (pd > 37) { player.x *= 37 / pd; player.z *= 37 / pd; }
    for (const ob of obstacles) {
      const dx = player.x - ob.x, dz = player.z - ob.z;
      const d = Math.hypot(dx, dz);
      const min = ob.r + 0.35;
      if (d < min && d > 0.001) { player.x = ob.x + (dx / d) * min; player.z = ob.z + (dz / d) * min; }
    }
    walkPhase = il > 0.05 ? walkPhase + dt * 7 * sprint : 0;

    // proximity check for shards
    nearShard = -1;
    for (let i = 0; i < shards.length; i++) {
      const sh = shards[i];
      if (sh.collected) continue;
      if (Math.hypot(player.x - sh.x, player.z - sh.z) < 2.6) { nearShard = i; break; }
    }
    if (state === 'play' && nearShard >= 0 && !dlgLine) {
      prompt.textContent = MODE === 'mobile' ? 'TAP ACT — RECOVER MEMORY' : 'E — RECOVER MEMORY';
      prompt.style.display = 'block';
    } else {
      prompt.style.display = 'none';
    }
  }

  // typewriter (time-based: ~38 chars/s regardless of frame rate)
  if (dlgLine && dlgChars < dlgLine[1].length) {
    dlgAccum += dt * 38;
    const next = Math.min(dlgLine[1].length, dlgChars + Math.floor(dlgAccum));
    if (next > dlgChars) {
      dlgAccum -= next - dlgChars;
      dlgChars = next;
      dlgText.textContent = dlgLine[1].slice(0, dlgChars);
      if (dlgChars % 3 === 0) SFX.tick();
      if (dlgChars === dlgLine[1].length) dlgMore.textContent = '▼';
    }
  }

  animate(t);
  const bob = Math.sin(walkPhase) * 0.05;
  updateView(bob);
  sortAndUpload(view);

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindVertexArray(vao);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);

  requestAnimationFrame(step);
}
requestAnimationFrame(step);

// Debug/automation hook (also used by headless smoke tests)
window.SparrowsSplat = {
  player, shards, obstacles,
  splatCount: count,
  advanceDialogue,
  tryInteract,
  get state() { return state; },
  get dialogueOpen() { return !!dlgLine; },
  get collected() { return collectedCount; },
};
