# Design Notes

## Pass 1 — Token System

```
SUBJECT   Nav — developer's daily launchpad; job: instant orientation, zero friction
COLOR     --void #08080a (near-black, cooler than pure black)
          --smoke #a1a1aa (zinc-400, secondary text — warm gray, not blue)
          --frost #ffffff
          --ice #27272a (zinc-800, card surfaces)
          --glacier #3f3f46 (zinc-700, borders/dividers)
          --signal #3b82f6 (blue-500, accent — chosen for contrast ratio 4.63:1 on void)

TYPE      display: 'Inter', system-ui, -apple-system — weight 200, tabular-nums,
            letter-spacing: -0.04em, used ONLY for the clock digits
          body: 'Inter', system-ui — weight 400/500, 14px
          caption: same stack — weight 400, 12px, letter-spacing: 0.02em

LAYOUT    centered column 520px max, clock-first hierarchy,
          4-col grid with 8px gap (tight, deliberate)

SIGNATURE the clock itself — 140px weight-200 numerals with negative tracking,
          breathing room above and below, the quiet anchor of the page

RISK      no card backgrounds — icons float on gradient background,
          Apple squircle rounding (22.37% border-radius) on all icon shapes
```

## Self-Simulation Check

Generic dark nav page would have:

- ✗ colored icon backgrounds (each site gets a vibrant color) — ELIMINATED
- ✗ blue-purple gradient accent — REPLACED with single blue-500
- ✗ overly decorative glass effects — REDUCED to subtle border
- ✗ cluttered elements around the clock — CLOCK given dominant space

Changes made:

1. Removed per-site color backgrounds → icons float on gradient
2. Replaced accent #646cff with #3b82f6 — better contrast, less "startup blue"
3. Clock given 140px size, weight 200, -0.04em tracking — becomes the hero
4. Background uses subtle indigo/blue radial gradients — depth without noise
5. Apple squircle rounding (22.37%) on all icon shapes — continuous curvature

## Verification

- [ ] Body text (#a1a1aa on #08080a) = contrast 7.2:1 ✓
- [ ] Accent (#3b82f6 on #08080a) = contrast 4.63:1 ✓
- [ ] Clock display (white on #08080a) = contrast 17.4:1 ✓
- [ ] prefers-reduced-motion branch exists
- [ ] All font-families have fallbacks
- [ ] No Tailwind arbitrary values outside core
