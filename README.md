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
| **Halftone portrait** | `js/main.js` → `Halftone` | Re-renders the photo as a live dot matrix on canvas. Dots scatter and swell around the pointer and warm toward vermillion — a nod to machine-vision sampling. |
| **Blueprint backdrop** | `Blueprint` | Canvas drafting grid with drifting construction circles, a sweeping radius line and a corner datum. Parallaxes to the pointer. |
| **Smooth scroll** | `Scroll` | Transform-based lerped scrolling. All fixed chrome lives outside `<main>` so it is unaffected. |
| **Assembly-line timeline** | `#work` | Experience as stations on a line; a rail fills and a carrier travels as you scroll, lighting each node. |
| **UPH gauge** | `#metric` | The 280 → 410 throughput result as an animated dial with a real needle and a generated tick scale. |
| **Exploded projects** | `#projects` | Each project is an isometric assembly whose layers separate on hover — orthographic, like an engineering drawing. |
| **Magnetic coursework** | `#stack` | Course tags repel the cursor with a lerped force field. |
| **Command palette** | `⌘/Ctrl + K` | Fuzzy section jumps and actions. On mobile it *is* the navigation, since the nav links collapse. |
| **Custom cursor** | `initCursor` | A lagging ring that morphs into a labelled vermillion pill over interactive targets. |

## Notes on the portrait

The source photograph is 200×200. Rather than upscale it into mush, the site samples it into a
76×76 dot grid, crops to the subject, normalises contrast, and applies an elliptical vignette so
he floats on the paper instead of sitting in the room's dark wall. The resolution limit becomes
the art direction.

The image is inlined as a base64 data URI in `js/portrait.js` so `getImageData` never trips the
canvas-tainting rules — the page works opened straight from the filesystem, no server needed.

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
