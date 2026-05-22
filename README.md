# 🕊️ THE SPARROWS: Generational Warfare

**One story. Eight graphical eras. Each season evolves the medium.**

A browser-based action game series that progresses through the history of video game graphics—starting from Atari 2600 and evolving through each console generation as you complete each season.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-in%20development-yellow.svg)
![Seasons](https://img.shields.io/badge/seasons-8%20of%208-gold.svg)

---

## 📖 The Story

> *"Born of the Festival. Forged in Silence. Awakened by Truth."*

**The Sparrows** follows four elite operatives—descendants of the Soviet "Children of the Festival" generation. Each carries the legacy of cross-continental solidarity movements from the 1950s-1980s, now weaponized for a fractured modern world.

### The Team

| Operative | Heritage | Specialty | Background |
|-----------|----------|-----------|------------|
| **Natasha Gannibal** | Russia × Ethiopia | Hacker | Descendant of Abram Gannibal's line, mathematical prodigy |
| **Maria Kofi** | Ghana × Ukraine | Combat | Capoeira-Systema fusion fighter, counter-insurgency expert |
| **Anya Delgado** | Cuba × Russia × Angola | Sniper | Cold War legacy, precision under pressure |
| **Olga Hassanova** | Uzbek × Sudanese | Strategy | Cipher specialist, spiritual and tactical core |

---

## 🎮 Generational Roadmap

The game's visual and mechanical complexity evolves with each season:

| Season | Era | Style Reference | Narrative Arc | Status |
|--------|-----|-----------------|---------------|--------|
| 1 | Atari 2600 (1977-1983) | Combat, Adventure | The Awakening | ✅ Complete |
| 2 | NES/SMS (1985-1992) | Contra, Ninja Gaiden | Training Day | ✅ Complete |
| 3 | SNES/Genesis (1991-1996) | Streets of Rage, Metal Slug | The Mission Begins | ✅ Complete |
| 4 | PS1/N64 (1995-2000) | Metal Gear Solid, GoldenEye | Bonds Tested | ✅ Complete |
| 5 | PS2/Xbox (2000-2005) | Splinter Cell, SOCOM | Revelations | ✅ Complete |
| 6 | PS3/360 (2005-2013) | Uncharted, Gears of War | Shadows Rising | ✅ Complete |
| 7 | PS4/XB1 (2013-2020) | The Last of Us, Metal Gear V | Showdown | ✅ Complete |
| 8 | Current Gen (2020+) | Modern AAA | Resolution | ✅ Complete |

**🎉 THE SPARROWS - COMPLETE SERIES 🎉**

*From Atari to Current Gen. Eight seasons. Twenty years of story. Four sisters. One unbreakable bond.*

---

## 🕹️ How to Play

### Quick Start
1. Open any season's HTML file in a modern browser
2. No installation required—fully browser-based

### Season 1: The Awakening (Atari Era)
- **Arrow Keys** — Move
- **Spacebar** — Action (context-sensitive per character)
- Complete all four character screens to assemble the Sparrows

### Season 2: Training Day (NES Era)
- **Arrow Keys** — Move
- **Z** — Jump
- **X** — Attack
- **C** — Switch Character
- Progress through 4 stages including boss battle

### Season 3: The Mission Begins (SNES/Genesis Era)
- **Arrow Keys** — Move (including up/down for depth)
- **Z** — Attack (combo system)
- **X** — Jump
- **C** — Special Attack (uses energy)
- **A** — Switch Character
- Beat-em-up action across 4 stages with boss finale

### Season 4: Bonds Tested (PS1/N64 Era)
- **WASD/Arrows** — Move
- **Shift** — Sneak (reduce visibility)
- **Space** — Interact (doors, terminals)
- **E** — CQC Takedown (from behind)
- **Q** — Use Gadget
- **Tab** — Codec
- **ESC** — Pause
- Tactical stealth across 4 missions

### Season 5: Revelations (PS2/Xbox Era)
- **WASD** — Move
- **Shift** — Sprint
- **Ctrl** — Toggle Crouch
- **Space** — Take Cover / Interact
- **E** — Takedown
- **Q** — Ability
- **F** — Cycle Vision Mode (Normal/Night/Thermal)
- **Tab** — View Objectives
- **ESC** — Pause
- Advanced stealth with cover system across 3 international missions

### Season 6: Shadows Rising (PS3/360 Era)
- **WASD** — Move
- **Space** — Jump / Take Cover
- **Click** — Fire Weapon
- **R** — Reload
- **Q** — Character Ability
- **1-4** — Squad Commands (Follow/Hold/Attack/Regroup)
- **Tab** — View Objectives
- **ESC** — Pause
- HD cinematic action with squad-based combat across 3 missions

### Season 7: Showdown (PS4/XB1 Era)
- **WASD** — Move
- **Shift** — Sprint
- **Ctrl** — Crouch
- **Space** — Take Cover
- **Click** — Fire Weapon
- **RMB** — Aim Down Sights
- **R** — Reload
- **Q** — Character Ability
- **C** — Companion Command (Follow/Hold/Attack)
- **H** — Use Medkit
- **Tab** — Inventory & Crafting
- **ESC** — Pause
- Open-level stealth action with companion AI, crafting, and Viper boss battles

### Season 8: Resolution (Current Gen - FINAL)
- **WASD** — Move
- **Shift** — Sprint
- **Space** — Dodge Roll
- **Click** — Fire Weapon
- **RMB** — Aim Down Sights
- **R** — Reload
- **Q** — Character Ability
- **E** — Ultimate Ability
- **1-4** — Switch Active Character
- **Tab** — Return to Hub
- **ESC** — Pause
- All four Sparrows playable with hot-swap, ultimate abilities, mission hub, and cinematic finale

---

## 📁 Project Structure

```
sparrows/
├── README.md
├── LICENSE
├── package.json              # Phaser 4 + Vite (future seasons only)
├── vite.config.js            # Multi-entry Vite config with @shared alias
├── TOOLCHAIN.md              # Aseprite + Tiled + Phaser 4 pipeline guide
├── shared/
│   └── phaser/
│       ├── EraConfigs.js     # Hardware configs for all 8 eras
│       ├── BaseScene.js      # Base class with auto filter application
│       └── RetroFilters.js   # Phaser 4 camera filter helpers
├── seasons/
│   ├── season1-atari/
│   │   └── index.html        # Vanilla JS — no build step required
│   ├── season2-nes/ … season8-current/  # Same — all standalone
│   └── season-phaser-template/   # Phaser 4 starter for new seasons
├── docs/
│   ├── ORIGINS_BIBLE.md
│   ├── GAME_DESIGN.md
│   └── CHANGELOG.md
└── assets/
```

---

## 🛠️ Technical Details

### Season 1 (Atari 2600 Authentic)
- **Resolution:** 160×120 native, scaled 4x
- **Colors:** Authentic NTSC Atari palette (128 colors)
- **Audio:** Web Audio API square/sawtooth waves
- **Features:** CRT shader, scanlines, phosphor glow

### Season 2 (NES/Master System)
- **Resolution:** 256×224 native, scaled 3x
- **Colors:** Full NES 2C02 PPU palette
- **Audio:** Multi-voice chiptune synthesis
- **Features:** Side-scrolling engine, cutscene system, character switching

### Season 3 (SNES/Genesis)
- **Resolution:** 320×224 native, scaled 3x
- **Colors:** 16-bit palette with gradients
- **Audio:** Enhanced multi-channel synthesis
- **Features:** Beat-em-up engine, combo system, parallax backgrounds, depth sorting

### Season 4 (PS1/N64)
- **Resolution:** 320×240 native, scaled 3x
- **Colors:** Muted tactical palette
- **Audio:** Atmospheric synthesis with codec effects
- **Features:** Stealth engine, vision cones, AI state machines, radar system, codec communications

### Season 5 (PS2/Xbox)
- **Resolution:** 512×384 native, scaled 2x
- **Colors:** Full dynamic lighting palette
- **Audio:** Enhanced synthesis with positional awareness
- **Features:** Cover system, vision modes (Normal/Night/Thermal), advanced AI with hearing, dynamic lighting, film grain effects

### Season 6 (PS3/360)
- **Resolution:** 640×360 native, scaled 2x to 1280×720 (HD)
- **Colors:** Full HD palette with gradients
- **Audio:** Cinematic synthesis with character themes
- **Features:** Squad command system, cover-based shooting, wave combat, boss battles, character abilities, cinematic cutscenes

### Season 7 (PS4/XB1)
- **Resolution:** 640×360 native, scaled 2x to 1280×720 (Full HD)
- **Colors:** Modern realistic palette with atmospheric lighting
- **Audio:** Advanced synthesis with environmental awareness
- **Features:** Companion AI system, crafting/inventory, stealth visibility mechanics, enemy AI state machine (patrol/alert/combat/search), boss battles, stamina system, multiple objectives per level

### Season 8 (Current Gen - FINAL)
- **Resolution:** 640×360 native, scaled 2x to 1280×720 (Full HD)
- **Colors:** Cinematic palette with gold/blue accents
- **Audio:** Full synthesis with dynamic feedback
- **Features:** All four Sparrows playable with real-time hot-swap, mission hub system, character-specific abilities AND ultimates, dodge roll with i-frames, combo system, shield regeneration, slow-motion ultimate (Oracle), Project Phoenix boss fight (4 enemy clones), progressive mission unlocking, credits sequence

---

## 🚀 Development

### Running Locally (Seasons 1–8 — no build step)
```bash
# Clone the repository
git clone https://github.com/khaaliswooden-max/sparrows.git

# Open any season directly in your browser
open seasons/season1-atari/index.html
```

### Browser Compatibility
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

---

## ⚙️ Phaser 4 Toolchain (Future Seasons)

Seasons 1–8 are complete and self-contained. The Phaser 4 toolchain is set up for **future season development**.

### Quick Start
```bash
npm install
npm run dev:template   # opens the NES-era template at localhost:3000
```

### Stack

| Tool | Role |
|------|------|
| **Phaser 4** | Primary engine — WebGL renderer, pixel-art mode, built-in retro filters |
| **Vite 5** | Dev server + bundler |
| **Aseprite** | Pixel art + animation → PNG spritesheets |
| **Tiled** | Tile-based level editor → JSON tilemaps (Phaser reads natively) |
| **GB Studio** | Optional: Game Boy ROM + WASM build (see the `1977` repo) |

### Era configs
`shared/phaser/EraConfigs.js` defines the Phaser 4 game config (resolution, zoom, filters, physics) for every era. Future seasons just import the matching era key:

```js
import { EraConfigs } from '@shared/phaser/EraConfigs.js';
const ERA = EraConfigs['nes']; // or atari2600, snes, ps1, ps2, ps3, ps4, currentGen
```

### Starting a new season
```bash
cp -r seasons/season-phaser-template seasons/season9-xxx
# Edit src/config.js — set ERA_KEY to your era
# Register entry in vite.config.js and package.json
```

See [TOOLCHAIN.md](TOOLCHAIN.md) for the full Aseprite + Tiled + filter pipeline.

---

## 📜 Origins Bible

The full character backgrounds, ancestral lineages, and thematic framework are documented in `/docs/ORIGINS_BIBLE.md`. Key themes include:

- **Identity as Inheritance** — Each Sparrow carries ideological DNA from cross-continental solidarity movements
- **Belief vs. Ideology** — The Cold War promised equality without God; this generation seeks justice with faith and conscience
- **Sisterhood Beyond Borders** — The Afro-Asian-Latin solidarity once dreamed of, reborn as women healing a fractured world
- **Memory as Weapon** — Truth, empathy, and intellect against systems that erased their families' origins

---

## 🎯 Roadmap

### Near Term
- [ ] Audio improvements (full chiptune soundtrack for Seasons 1–8)
- [ ] Save system via localStorage
- [ ] Mobile touch controls optimization

### Long Term
- [ ] Future seasons using Phaser 4 toolchain
- [ ] Multiplayer co-op mode
- [ ] Level editor
- [ ] Speedrun timer/leaderboards

---

## 👥 Credits

**Concept & Narrative:** Khaalis Wooden  
**Development:** Zuup Innovation Lab / Visionblox LLC  
**Engine (Seasons 1–8):** Pure HTML5 Canvas + JavaScript  
**Engine (Future Seasons):** Phaser 4

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🔗 Links

- **Play Now:** [GitHub Pages](https://khaaliswooden-max.github.io/sparrows/)
- **1977 Repo:** [Season 1 Phaser 4 standalone](https://github.com/khaaliswooden-max/1977)
- **Visionblox:** [visionblox.com](https://visionblox.com)
- **Zuup Innovation Lab:** Coming Soon

---

*"Aim with memory; fire with mercy."* — Anya Delgado
