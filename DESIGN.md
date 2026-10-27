# Toll design system v2: "Blue Ledger"

One codebase, one domain, two compositions. Desktop is a scroll-scrubbed film plus a master-detail workspace. Phones (under 768px) are recomposed as an app: app bar, glass tab bar, bottom sheets, snap carousel.

## Look

- **Light page, navy stage.** Ground `#f3f6fb`, ink `#0a1b3d`. The story, ledger and vault live on a navy stage (`#06143a`), so every dark plane means "this is the machine".
- **One accent: PayPal blue** `#0070e0` (deep `#003087`, sky `#009cde`). Released = green `#0a8f5c`, spam = red `#d92d3a`. PayPal gold appears only on PayPal's own button.
- **Type:** Plus Jakarta Sans (voice, 800 weight, tracking -0.045em on display) and Geist Mono (numbers and labels, tabular).
- **Shape:** 28px outer radius, 22px inner (double bezel: a tray holding a core). Pills for actions.
- **Glass** only where something floats: the nav pill, the tab bar, the vault pane.

## Mark

A "T" whose crossbar is the toll barrier and whose stem ends in the coin that pays it, on a blue gradient tile. Splash: the tile outline is drawn by real loading work, then the tile fills, the T lands, the coin drops, and the screen lifts away. Shown once per session.

## Motion

GSAP ScrollTrigger scrubs the landing story; Lenis (lerp 0.085) runs from one GSAP ticker on fine pointers only. Phones keep native scroll. Press scale 0.97, hover under 0.2s, magnetic buttons lean 3px max, glass catches a pointer highlight. Sheets track the finger 1:1, rubber-band upward, and close on distance or flick velocity.

## Phone shell (same routes, same domain)

- `components/tabbar.tsx`: Home, Write, Inbox; safe-area aware; sliding active pill.
- `components/sheet.tsx`: bottom sheet (portalled to body).
- `components/mobile-home.tsx`: stage card whose vault loops the story, tappable step switcher, snap carousel.
- Inbox: lanes as a segmented control, messages open in a sheet. Desktop: list left, open message with score dial right.
- Baseline: `viewport-fit=cover`, `dvh`, tap highlight off, 16px inputs, `overscroll-behavior: none`, `touch-action: manipulation`.
