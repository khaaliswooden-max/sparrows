# 🎮 The Sparrows: Game Design Document

## Core Concept

**The Sparrows: Generational Warfare** is a browser-based action game that tells a single continuous story across eight distinct graphical eras—each season evolving the visual and mechanical complexity to match the console generation it represents.

### Design Philosophy

1. **Authentic Era Constraints** — Each season respects the technical limitations of its era (resolution, color palette, sprite sizes, input methods)
2. **Mechanical Evolution** — Gameplay complexity grows with graphical fidelity
3. **Narrative Continuity** — The story progresses seamlessly across generations
4. **Pure Web Technology** — No frameworks, no build tools—just HTML5 Canvas and JavaScript

---

## Generational Specifications

### Season 1: Atari 2600 Era (1977-1983)

| Spec | Value | Rationale |
|------|-------|-----------|
| Native Resolution | 160×120 | Authentic 2600 framebuffer |
| Scale Factor | 4x | Modern display adaptation |
| Color Palette | 128 NTSC colors | 2600 TIA chip accurate |
| Colors Per Scanline | 4 max | Hardware limitation |
| Sprite Size | 8×12 pixels | Player missile graphics |
| Input | 1 joystick + 1 button | Atari controller |
| Save System | None (password) | Era-accurate |
| Audio | Square wave + noise | TIA sound channels |

**Gameplay Style:** Single-screen arcade, flip-screen progression
**Reference Games:** Combat, Adventure, Berzerk, Pitfall

**Character Mechanics:**
- Natasha (Hacker) → Adventure-style maze navigation
- Maria (Combat) → Berzerk-style arena combat
- Anya (Sniper) → Missile Command-style fixed targeting
- Olga (Strategy) → Resource management, tactical positioning

---

### Season 2: NES/Master System Era (1985-1992)

| Spec | Value | Rationale |
|------|-------|-----------|
| Native Resolution | 256×224 | NES PPU standard |
| Scale Factor | 3x | Display adaptation |
| Color Palette | 54 colors | 2C02 PPU palette |
| Sprites Per Line | 8 max | Hardware sprite limit |
| Sprite Size | 16×24 pixels | 8×8 tile-based |
| Input | D-pad + A/B buttons | NES controller |
| Save System | Stage select | Password or battery |
| Audio | 5 channels | 2A03 APU emulation |

**Gameplay Style:** Side-scrolling action platformer
**Reference Games:** Contra, Ninja Gaiden, Castlevania, Mega Man

**Character Mechanics:**
- Natasha → Electric projectile, mid-range
- Maria → Melee combat, high mobility
- Anya → Long-range bullets, precision
- Olga → Tactical drones, area control

**Stage Structure:**
1. Training Facility — Combat basics
2. Obstacle Course — Platforming challenges
3. Simulation Room — Mixed combat
4. The Crucible — Boss encounter

---

### Season 3: SNES/Genesis Era (1991-1996) [PLANNED]

| Spec | Value | Rationale |
|------|-------|-----------|
| Native Resolution | 320×224 | Mode 1 standard |
| Scale Factor | 3x | Display adaptation |
| Color Palette | 256 on-screen | 15-bit color |
| Sprite Size | 32×32 pixels | Larger character art |
| Input | D-pad + 6 buttons | Genesis controller |
| Audio | 16-bit samples | PCM + FM synthesis |

**Gameplay Style:** Beat-em-up / run-and-gun hybrid
**Reference Games:** Streets of Rage, Metal Slug, Gunstar Heroes

**Planned Features:**
- 4-player simultaneous (hot-seat)
- Combo system
- Destructible environments
- Mode 7-style rotation effects

---

### Season 4: PS1/N64 Era (1995-2000) [PLANNED]

**Gameplay Style:** 3D action-stealth hybrid
**Reference Games:** Metal Gear Solid, GoldenEye, Syphon Filter

**Planned Features:**
- Low-poly 3D graphics (WebGL)
- First/third-person toggle
- Stealth mechanics
- Codec-style communications

---

### Season 5: PS2/Xbox Era (2000-2005) [PLANNED]

**Gameplay Style:** Tactical squad shooter
**Reference Games:** Splinter Cell, SOCOM, Freedom Fighters

---

### Season 6: PS3/360 Era (2005-2013) [PLANNED]

**Gameplay Style:** Cinematic action-adventure
**Reference Games:** Mass Effect, Uncharted, Gears of War

---

### Season 7: PS4/XB1 Era (2013-2020) [PLANNED]

**Gameplay Style:** Open-world stealth action
**Reference Games:** MGSV, Horizon Zero Dawn, Watch Dogs

---

### Season 8: Current Generation [PLANNED]

**Gameplay Style:** Photorealistic or stylized culmination
**Reference Games:** Modern AAA standards

---

## Character System

### Base Stats (Season 2+)

| Character | Speed | Jump | Attack Range | Attack Type |
|-----------|-------|------|--------------|-------------|
| Natasha | 2.5 | 7.0 | 60 | Electric (projectile) |
| Maria | 3.0 | 8.0 | 24 | Melee (contact) |
| Anya | 2.0 | 6.5 | 200 | Ranged (bullet) |
| Olga | 2.2 | 7.0 | 80 | Tactical (drone) |

### Progression System (Season 3+)

- Experience points per enemy defeated
- Unlockable special moves
- Weapon upgrades
- Team combo attacks

---

## Audio Design

### Season 1 (Atari)
- Single channel square wave
- Frequency range: 50Hz - 1200Hz
- No music, only SFX

### Season 2 (NES)
- 2× Square wave channels
- 1× Triangle wave (bass)
- 1× Noise channel (percussion)
- Simple melodic loops

### Season 3+ (SNES onward)
- Full soundtrack implementation
- Character-specific themes
- Dynamic music system

---

## UI/UX Patterns

### HUD Evolution

| Era | Health Display | Score | Lives | Minimap |
|-----|----------------|-------|-------|---------|
| Atari | None (1-hit) | Numeric | N/A | N/A |
| NES | Bar | Numeric | Icons | N/A |
| SNES | Bar + Numbers | Combo counter | Icons | Stage preview |
| PS1+ | Radial/3D | Contextual | Checkpoint | Full map |

---

## Save System Evolution

| Era | Method |
|-----|--------|
| Atari | None / Password |
| NES | Password / Stage Select |
| SNES | Battery RAM (localStorage) |
| PS1+ | Memory Card (IndexedDB) |

---

## Performance Targets

- 60 FPS on modern browsers
- < 100ms input latency
- < 5MB total file size per season
- Offline-capable (Service Worker ready)

---

## Accessibility Considerations

- Colorblind-friendly palette options
- Remappable controls
- Difficulty settings (Season 3+)
- Screen reader support for menus

---

*Document Version: 1.0*
*Last Updated: December 2024*
