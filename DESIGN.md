# Toll: design system

**Brief.** Toll is a refundable cover charge for your inbox, for people with more inbound than time. It should feel like money held safely behind glass: calm, weighty and fair. Closest in spirit to Apple Wallet's card physics, a private bank's vault-glass lobby, and the franking mark on a letter.

**Why this look.** Toll's core act is a PayPal hold: money that is still yours, visible, but held. That is literally a coin behind glass. The ground is the green-black of thick float glass, the action colour is brass, and spam is struck with a red postmark, the way post offices cancel a stamp.

## Tokens

| Token | Value | Job |
|---|---|---|
| `--ground` | `#08100d` | vault green-black, the page |
| `--raised` | `#0e1814` | solid fallback for glass |
| `--ink` | `#edf3ef` | text |
| `--muted` | `#94a69d` | quiet text (AA on ground) |
| `--hair` | ink at 10% | hairlines |
| `--glass` | `rgb(196 232 213 / 6%)` + 22px blur | anything that floats or holds money |
| `--brass` | `#ddb76e` | the one accent: you can act here; also the coin |
| `--mint` | `#8fddb2` | released (state only) |
| `--postmark` | `#e46a50` | spam or charged (state only) |

## Type

- **Manrope** (voice): display 700 at tracking −0.05em, line height 0.95; body 17px.
- **Martian Mono** (data): labels 11px uppercase, tracking 0.14em; all numbers use tabular figures.

## Shape

- Surfaces are 22px. Corners inside a surface are concentric (22 minus the inset, so fields are 14px). Buttons and chips are pills.
- Strokes are 1px hairlines at 10% ink. Depth comes from glass and tone, not borders.

## Motion

- Rare reveals: `expo.out`, 1.1s, overlaps allowed. Story: scroll-scrubbed (`scrub: 0.6`) under Lenis (`lerp 0.085`).
- Interface: `cubic-bezier(0.22, 1, 0.36, 1)`, 0.2 to 0.45s, no overshoot. Hover 0.18s. Press scale 0.97.
- Cursor (fine pointers only): magnetic buttons (3px max), a specular highlight that follows the pointer across glass, the coin tilting toward the pointer, a soft ripple when glass is tapped.
- Reduced motion: no smooth scroll, no splash, the story becomes still frames of the same scene.

## Metaphor

**The vault.** A brass coin sits behind a frosted pane. A hold slides the coin behind the glass. A letter crosses the pane and a reading line scans it. Worth it: the coin rises back out, mint. Spam: a red postmark strikes the coin and it drops through the slot to charity. The logo is the vault reduced to a stamp: a perforated stamp frame, the coin, and the pane line across it.
