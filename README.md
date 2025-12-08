# 🕊️ THE SPARROWS: Generational Warfare

**One story. Eight graphical eras. Each season evolves the medium.**

A browser-based action game series that progresses through the history of video game graphics—starting from Atari 2600 and evolving through each console generation as you complete each season.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-in%20development-yellow.svg)
![Seasons](https://img.shields.io/badge/seasons-2%20of%208-green.svg)

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
| 3 | SNES/Genesis (1991-1996) | Streets of Rage, Metal Slug | The Mission Begins | 🔄 Next |
| 4 | PS1/N64 (1995-2000) | Metal Gear Solid, GoldenEye | Bonds Tested | ⏳ Planned |
| 5 | PS2/Xbox (2000-2005) | Splinter Cell, SOCOM | Revelations | ⏳ Planned |
| 6 | PS3/360 (2005-2013) | Mass Effect, Uncharted | The Betrayal | ⏳ Planned |
| 7 | PS4/XB1 (2013-2020) | MGSV, Horizon | Showdown | ⏳ Planned |
| 8 | Current Gen | Photorealism/Stylized | The Capture & Resolution | ⏳ Planned |

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

---

## 📁 Project Structure

```
sparrows/
├── README.md
├── LICENSE
├── seasons/
│   ├── season1-atari/
│   │   └── index.html          # Episode 1: The Awakening
│   └── season2-nes/
│       └── index.html          # Episodes 2-4: Training Day
├── docs/
│   ├── ORIGINS_BIBLE.md        # Character lore and world-building
│   ├── GAME_DESIGN.md          # Technical design document
│   └── CHANGELOG.md            # Version history
└── assets/
    └── (future sprite sheets, audio files)
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

---

## 🚀 Development

### Running Locally
```bash
# Clone the repository
git clone https://github.com/khaaliswooden-max/sparrows.git

# Open any season in your browser
open seasons/season1-atari/index.html
```

### Browser Compatibility
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

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
- [ ] Season 3: SNES/Genesis era (Streets of Rage style beat-em-up)
- [ ] Audio improvements (full chiptune soundtrack)
- [ ] Save system via localStorage
- [ ] Mobile touch controls optimization

### Long Term
- [ ] Seasons 4-8 development
- [ ] Multiplayer co-op mode
- [ ] Level editor
- [ ] Speedrun timer/leaderboards

---

## 👥 Credits

**Concept & Narrative:** Khaalis Wooden  
**Development:** Zuup Innovation Lab / Visionblox LLC  
**Engine:** Pure HTML5 Canvas + JavaScript (no frameworks)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🔗 Links

- **Play Now:** [GitHub Pages](https://khaaliswooden-max.github.io/sparrows/)
- **Visionblox:** [visionblox.com](https://visionblox.com)
- **Zuup Innovation Lab:** Coming Soon

---

*"Aim with memory; fire with mercy."* — Anya Delgado
