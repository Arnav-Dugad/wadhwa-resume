# Aditya Shankar Wadhwa — Portfolio

An interactive résumé site for a mechatronics engineer. Light, editorial, and built to feel
like a drafting table rather than a template.

**Live:** enable GitHub Pages on `main` → `/ (root)`, then visit
`https://arnav-dugad.github.io/wadhwa-resume/`

---

## Design language

Swiss-technical editorial on paper stock. Cream ground (`#F4F1EC`), ink type (`#14161A`),
a single vermillion signal colour (`#C8442A`) and a blueprint navy (`#16394B`) used only for
depth. Display type is Instrument Serif; UI is Inter Tight; every label, index and readout is
JetBrains Mono — the mono/serif contrast is what makes it read as art-directed rather than
generated.

The whole surface carries an animated SVG grain overlay in `multiply` blend, so the page
behaves like printed stock instead of a flat screen.

## The pieces worth knowing about

| Feature | Where | What it does |
|---|---|---|
| **CMYK halftone portrait** | `js/main.js` → `Halftone` | A WebGL fragment shader separates the photo into cyan/magenta/yellow/black and screens each on its own classic offset angle (15° / 75° / 0° / 45°), recombining them subtractively over the paper. Keeps the photograph's real colour while reading as printed matter. |
| **Fluid pointer lens** | same shader | The plate rests as a continuous-tone photograph. The screen blooms outward from the pointer like a loupe travelling over the stock, carrying a displacement field — radial push, tangential swirl, travelling ripple — plus per-separation chromatic aberration and a local rise in screen frequency. Degrades to a 2D canvas colour screen where WebGL is missing. |
| **Org logos** | `.orglogo` / `.certlogo` | Employer, university and certification marks in full colour, composited with `multiply` so the white ground most of them ship with drops away and they sit *on* the paper stock. |
| **Blueprint backdrop** | `Blueprint` | Canvas drafting grid with drifting construction circles, a sweeping radius line and a corner datum. Parallaxes to the pointer. |
| **Smooth scroll** | `Scroll` | Transform-based lerped scrolling. All fixed chrome lives outside `<main>` so it is unaffected. |
| **Assembly-line timeline** | `#work` | Experience as stations on a line; a rail fills and a carrier travels as you scroll, lighting each node. |
| **UPH gauge** | `#metric` | The 280 → 410 throughput result as an animated dial with a real needle and a generated tick scale. |
| **Exploded projects** | `#projects` | Each project is an isometric assembly whose layers separate on hover — orthographic, like an engineering drawing. |
| **Magnetic coursework** | `#stack` | Course tags repel the cursor with a lerped force field. |
| **Command palette** | `⌘/Ctrl + K` | Fuzzy section jumps and actions. On mobile it *is* the navigation, since the nav links collapse. |
| **Custom cursor** | `initCursor` | A lagging ring that morphs into a labelled vermillion pill over interactive targets. |

## Notes on the portrait

The plate is a real four-colour process screen, not a filter. Each separation snaps to its own
rotated grid; the dot at each cell is sized from the ink value sampled at that cell's centre, so
dot area is proportional to ink coverage the way it is on press. The four angles interfere into
the rosette pattern you get from offset printing. An elliptical vignette dissolves the room into
the paper so the subject floats rather than sitting in a dark slab.

`assets/portrait.jpg` (860 px) is the social-preview image. A 600 px copy is inlined as a base64
data URI in `js/portrait.js` so texture upload never trips the canvas-tainting rules — the page
works opened straight from the filesystem, no server needed. 600 px is ample: the screen samples
roughly 118 dots across, so a larger texture would be thrown away.

Because the screen is hover-revealed it would be invisible on touch and easy to miss on desktop,
so the plate demonstrates itself once the first time it scrolls into view, then hands control back
to the pointer. On touch, tapping the plate toggles it.

## Logos

`assets/logos/` — Dixon, Havells, LG, IIT Delhi, Michigan, Rice and Macquarie came from Wikimedia
via the MediaWiki API; Manipal, Gyan Bharati, Avendus, Foundation for Smart Manufacturing and
Impact Guru were supplied directly and are cropped/keyed to their artwork. The IIT Delhi internship
carries a two-mark lockup because the organisation genuinely is both.

Everything renders in full colour with `mix-blend-mode: multiply`, which drops the white card most
logo files carry without needing per-file masking.

## Mobile

The small-screen work is purely additive — every rule lives inside a `max-width` query, so the
desktop composition is byte-for-byte unchanged. Highlights: the name leads and the plate follows,
the palette becomes the navigation once the nav links collapse, the long wordmark scales rather
than truncating, and `@media (hover:none)` drops effects that only exist to reward a cursor.

## Accessibility & resilience

- Full `prefers-reduced-motion` branch: the preloader is skipped, all reveals resolve to their
  final state, and the cursor, scan sweep and parallax are disabled.
- Smooth scroll only engages for fine pointers; touch keeps native momentum.
- Keyboard focus inside the fixed scroll layer is scrolled into view explicitly.
- The preloader races asset loading against a 2.6 s deadline, so a slow webfont can never trap
  a visitor behind the curtain.
- A print stylesheet strips the chrome and lays the content out as a document.

## Structure

```
index.html            markup + content
css/style.css         tokens, layout, motion
js/portrait.js        photo as base64 data URI
js/main.js            interaction engine (no dependencies)
assets/               photo + résumé PDF
```

No build step, no framework, no runtime dependencies. Open `index.html` or serve the folder.

---

Content from Aditya Shankar Wadhwa's résumé. Contact: adityaswadhwa@gmail.com ·
[linkedin.com/in/adityaswadhwa](https://linkedin.com/in/adityaswadhwa)
