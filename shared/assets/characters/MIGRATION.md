# Migrating a Season to LPC Sprites

The shared renderer (`shared/libs/characterRenderer.js`) is auto-loaded by
every season via `enhance.js`, which calls `preloadCharacters()` on
start-up and exposes the API at `window.Sparrows.characters`.

## The minimal patch per season

Each season's `index.html` has a single function that draws one of the
four operatives — usually called `renderCharacterSprite`,
`drawPlayer`, or similar. Migration is three changes:

1. **Add a `key` field** to each entry in the season's `CHARACTERS`
   array: `'cipher' | 'venom' | 'hawk' | 'oracle'`.
2. **Wrap the existing draw function**: try `Sparrows.characters.drawCharacter(...)`
   first; if it returns `false` (assets not loaded yet), fall through to the
   legacy `fillRect` body so nothing breaks during preload.
3. **Tune scale + anchor** for the season's coordinate system. The renderer
   expects `(x, y)` to be the **centre-bottom** of the sprite; legacy code
   often used a top-left anchor at the upper torso.

The reference implementation lives in `seasons/season3-snes/index.html`
around `renderCharacterSprite()` (search for `Sparrows.characters`).

## Era-appropriate scales

`shared/libs/characterRenderer.js` exports `eraConfig(seasonNumber)`
which returns reasonable defaults:

| Seasons | Era            | Recommended `scale` | `imageSmoothing` |
|---------|----------------|---------------------|------------------|
| 1–2     | Atari / NES    | 0.45                | off              |
| 3–4     | SNES / PS1     | 1.00                | off              |
| 5–6     | PS2 / PS3      | 1.40                | off              |
| 7–8     | PS4+ / current | 1.80                | on               |

For Atari (Season 1) where the original art is essentially 6×10 pixel
blocks, the LPC sprite drawn at `0.45` scale looks oversized — consider
also rendering through a posterize/quantize filter (`shared/phaser/RetroFilters.js`)
so the LPC palette collapses toward the era's palette.

## Animations available

The PNGs that ship in `shared/assets/characters/` cover:

- `walk`  (9 frames)  — first frame doubles as the idle pose
- `slash` (6 frames)  — close-range melee
- `hurt`  (6 frames, 1 direction only) — knockback / damage flash

If a season needs `shoot`, `thrust`, `jump`, `run`, etc., re-clone the
LPC generator (the `vendor/` directory is gitignored) and copy the
matching `<animation>.png` files into each character's folder — then
add the entry to the `ANIMATIONS` map in `characterRenderer.js`.

## Re-extracting layers

```bash
# Sparse clone is enough — we only need the spritesheets tree.
git clone --depth=1 --filter=blob:none --sparse \
  https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator.git \
  vendor/lpc-generator
(cd vendor/lpc-generator && git sparse-checkout set spritesheets)

SRC=vendor/lpc-generator/spritesheets
DST=shared/assets/characters
for anim in walk slash hurt; do
  cp "$SRC/body/bodies/female/$anim.png" "$DST/body/$anim.png"
  # key:hair:torso-color:eye-color
  for ch in cipher:long_messy:sky:blue venom:bob:green:green hawk:longhawk:orange:brown oracle:long:tan:gray; do
    IFS=: read key hair torso_color eye_color <<< "$ch"
    cp "$SRC/hair/$hair/adult/$anim.png" "$DST/$key/hair_$anim.png"
    cp "$SRC/torso/clothes/sleeveless/sleeveless/female/$anim/$torso_color.png" "$DST/$key/torso_$anim.png"
    cp "$SRC/eyes/human/adult/neutral/$anim/$eye_color.png" "$DST/$key/eyes_$anim.png"
  done
done
```

**Important**: the LPC body PNG has no eyes or mouth drawn on — the
head is a blank skin-toned oval. The `eyes/` layer must be composited
onto the face between body and hair, otherwise the characters appear
featureless (which is the bug that shipped in the first commit).

## Attribution requirement

LPC art is licensed under CC-BY-SA / OGA-BY / GPL. **You must keep
`ATTRIBUTION.md` shipped alongside any distribution of these PNGs**
and credit the listed artists. See `ATTRIBUTION.md` in this folder.
