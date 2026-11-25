---
name: claude-switch
description: A switchboard for Claude Code accounts; the live account is patched in with a red cord.
colors:
  board: "#33251c"
  board-edge: "#271c15"
  rule: "#b88a3b55"
  on-board: "#efe4cc"
  on-board-2: "#d2bf9a"
  label: "#efe4cc"
  label-2: "#e4d6b8"
  ink: "#1e1712"
  ink-2: "#5a4330"
  brass: "#b88a3b"
  brass-hi: "#d9ae5f"
  cord: "#c23b2a"
  plate: "#171210"
  plate-text: "#e9dcc2"
  plate-2: "#b9a582"
  state-free: "#3f6b2f"
  state-resting: "#8a5a12"
  rim-resting: "#9c8a6d"
  alert: "#ff8a78"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.04em"
  title:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.02em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  data:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  button:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 650
    letterSpacing: "0.08em"
rounded:
  key: "4px"
  input: "6px"
  button: "7px"
  menu: "8px"
  card: "10px"
  pill: "11px"
  round: "50%"
spacing:
  xs: "8px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
  board-top: "44px"
components:
  button-primary:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "38px"
  button-primary-hover:
    backgroundColor: "{colors.brass-hi}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.on-board}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "38px"
  button-on-label-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.label}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "38px"
  button-icon:
    rounded: "{rounded.button}"
    size: "38px"
  jack:
    backgroundColor: "{colors.label}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "18px"
  terminal-line:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.plate-text}"
    rounded: "{rounded.card}"
    padding: "14px 18px 14px 58px"
  select:
    backgroundColor: "{colors.label-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "0 8px"
    height: "34px"
  menu:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.plate-text}"
    rounded: "{rounded.menu}"
    padding: "6px"
---

# Design System: claude-switch

## Overview

**Creative North Star: "The Switchboard"**

The terminal is a line and every Claude account is a jack on a walnut board. Exactly one jack is patched in, and a red cord runs from the terminal line's brass plug down into that jack's socket. The whole system exists to make that one fact, which account Claude Code is using right now, readable at a glance and changeable in one click.

The material is an old operator's console: a walnut-brown shell, cream label cards that read like typed index tags, brass for rims, rules and the controls you press, and a near-black plate for the terminal line. Names, emails, times and paths are typed in Courier Prime as if on a label maker; everything the interface itself says (buttons, hints, states) is in Archivo. Density is calm: a handful of cards in an auto-filling grid, one sticky footer, no sidebars. Controls are standard native widgets dressed in the board's materials, not reinvented.

The system refuses the grey settings list with avatar circles. Accounts are physical jacks with sockets and number keys, not rows.

**Key Characteristics:**
- One cord red, reserved for the live connection.
- Cream label cards on a walnut board; a dark plate for the terminal line in both color schemes.
- Courier Prime for data, Archivo for interface text.
- Brass for every rim, rule and pressable surface on the board.
- The patch cord is the only signature motion.

## Colors

A warm, low-saturation wood-and-brass palette with a single saturated red that means "connected".

### Primary
- **Cord Red** (cord): the live connection and nothing else. The cord path and its tip, the live jack's socket rim, the live jack's 2px ring, and the "Connected" state text. Light scheme keeps the same value.
- **Panel Brass** (brass, brass-hi on hover and focus): the pressable and structural metal. Primary buttons on the board, outline borders of secondary buttons, the terminal plug, socket rims of free jacks, the auto-switch track when on, focus outlines (brass-hi), scrollbar thumb, text selection.

### Neutral
- **Walnut Board** (board, board-edge): page background, header and sticky footer. Light scheme: `#cdb48b` / `#b99d70`.
- **Brass Rule** (rule, brass at 33% alpha): hairline dividers under the header and above the footer, the dashed border of the empty jack, key-cap borders. Light scheme: `#5a433055`.
- **Board Text** (on-board, on-board-2): primary and secondary text sitting directly on the board. Light scheme: `#22180f` / `#4a3523`.
- **Cream Label** (label, label-2): jack card face and the field fill inside cards. Light scheme: `#fbf6ea` / `#f1e8d4`.
- **Label Ink** (ink, ink-2): text on cream cards; ink also fills the card's primary button and the selection text. ink-2 carries meta lines, key caps, and the default state label.
- **Line Plate** (plate, plate-text, plate-2): the terminal line and the overflow menu. Stays dark in the light scheme, as does its text.

### State
- **Free Green** (state-free) and **Resting Amber** (state-resting): state text and dot on cream cards. Resting jacks also take a dulled rim (rim-resting).
- **Alert Salmon** (alert): error status text on the plate and the destructive menu item. It sits on the dark plate only.

### Named Rules
**The One Cord Rule.** Cord red appears only where the live connection is: the cord, the live socket, the live ring, the "Connected" label. Errors and destructive actions use Alert Salmon, never cord red. If a screen has two red things that are not the same connection, one of them is wrong.

**The Brass Is Metal Rule.** Brass marks things you could touch on a real board: rims, plugs, rules, buttons. It is not a text color for prose on the board.

## Typography

**Interface Font:** Archivo (variable 100–900, self-hosted, with system-ui fallback)
**Data Font:** Courier Prime (400 and 700, self-hosted, with ui-monospace fallback)

**Character:** A sturdy grotesque for the console's own voice, paired with a typewriter face for anything the user owns: account names, emails, plans, times, paths, key numbers.

### Hierarchy
- **Display** (Archivo 800, 19px, line-height 1, 0.04em, uppercase): the wordmark in the header only.
- **Title** (Courier Prime 700, 18px, 1.2, 0.02em, uppercase): the account name on each jack, and the empty jack's heading.
- **Body** (Archivo 400, 15px, 1.45): base text; hints and field labels step down to 13px.
- **Data** (Courier Prime 400, 14px, 1.5, tabular numerals): email and plan lines, the terminal line text, the status line (13px), the project select in the footer.
- **Button** (Archivo 600, 14px): every button label.
- **Label** (Archivo 650, 12px, 0.08em, uppercase): the jack state line ("Connected", "Free", "Resting · back by 02:24") with its 8px dot.

### Named Rules
**The Typed Label Rule.** If the user named it, owns it, or a machine reports it (account, email, plan, time, path, key number), it is set in Courier Prime. If the interface is speaking, it is Archivo.

## Layout

A single column of bands at a shared gutter: header, the terminal line, the board of jacks, and a sticky footer. The gutter is `max(clamp(16px, 3vw, 28px), (100vw - 1180px) / 2)`, so content caps at 1180px and centers on wide windows while keeping a 16px floor on phones.

The board is a CSS grid of jacks, `repeat(auto-fill, minmax(258px, 1fr))` with 18px gaps; it reflows from four columns to one with no breakpoint. The empty jack (add account) is always the last cell. The terminal line sits 22px below the header and the board starts 44px below the line, leaving room for the cord to sag. Below 560px the header's "unofficial" note and the line's hint are hidden. The footer is sticky to the bottom with a soft upward shadow.

Spacing steps observed: 8, 10, 14, 18, 24px; card padding 18px.

## Elevation & Depth

Depth is physical and soft: cards and the line sit slightly proud of the board with a short contact shadow plus a wider diffuse one. Nothing floats far except the overflow menu.

### Shadow Vocabulary
- **Raised** (`0 2px 3px #0000004d, 0 10px 24px -8px #00000080`; light scheme `0 1px 2px #3b2a2033, 0 10px 22px -10px #3b2a2066`): jack cards and the terminal line.
- **Live ring** (`0 0 0 2px cord` stacked on Raised): the live jack only.
- **Menu** (`0 4px 6px #0000004d, 0 18px 40px -12px #000000a0`): the overflow menu.
- **Footer lift** (`0 -10px 24px -14px #00000066`): the sticky footer.
- **Socket inset** (`inset 0 0 0 3px #3b2a20`): inside every jack socket.
- **Cord shadow** (`drop-shadow(0 3px 2px #00000059)`): under the patch cord.

### Named Rules
**The Flat Empty Jack Rule.** The empty jack has no shadow and no fill: a dashed outline on the bare board. Only accounts that exist are raised.

## Shapes

Gently rounded rectangles throughout, with radii stepping down as elements get smaller: cards and the line 10px, the menu 8px, buttons 7px, selects and inputs 6px, menu items 5px, key caps 4px. Sockets, the plug, the state dot and the toggle knob are true circles. A dashed hairline separates a jack's socket row from its name, and the empty jack uses a 2px dashed border with a dashed socket rim.

## Components

### Buttons
Standard, solid, quiet. 38px tall, 7px radius, 16px side padding, 8px gap to an 18px stroke icon.
- **Primary (on the board):** brass fill, ink text; hover to brass-hi.
- **Secondary (on the board):** transparent with a 1px brass border, board text; hover adds a 13% brass wash and a brass-hi border.
- **Primary (on a card):** ink fill, cream text; hover to `#3b2a20`. Disabled reads "Patched in" as an outline with ink-2 text.
- **Secondary (on a card):** transparent, `#5a433066` border, ink text.
- **Icon:** 38px square, same variants.
- **Busy:** a 12px spinning ring appended to the label; the button stops taking clicks.
- **Focus:** 2px brass-hi outline at 2px offset; inside cream cards the outline switches to ink.

### Jack (signature card)
Cream label card, 10px radius, 18px padding, Raised shadow, stacked 10px apart: socket row (38px socket with a 5px rim, number key cap at right), dashed rule, name in Title, data lines, state label, browser-profile select with globe icon, actions pinned to the bottom. Socket rim is brass when free, dulled `#9c8a6d` when resting, cord red when live; the live card adds the 2px cord ring.

### Terminal Line
The dark plate the cord starts from. A brass plug (16px circle with a 4px brass halo) sits at lower left under a dotted brass lead; Courier Prime status text, the auto-switch toggle at right, and a full-width hint and status line below.

### Patch Cord
A 5px round-capped cord-red SVG path from the plug to the live socket, ending in a 7px cord tip ringed in plate. Its sag scales with horizontal distance (capped at 120px). On a switch it redraws into the new jack with a 700ms stroke draw on `cubic-bezier(.16,1,.3,1)`; on resize it redraws instantly; under reduced motion it never animates.

### Inputs / Fields
- **Style:** native select and text input, 34px tall, 6px radius, `#5a433066` border, label-2 fill, ink text. Fields inside the empty jack use a cream fill with no border.
- **Focus:** the global brass-hi focus outline.

### Toggle
A native checkbox with `role="switch"`, 40 × 22px pill. Off: dark brown track with a cream knob. On: brass track with an ink knob sliding 18px on the system ease.

### Overflow Menu
A plate-colored list anchored top-right of its button, 220px minimum, 6px padding, items 9 × 10px with an icon and 14px Archivo. Hover and focus get a 8% white wash. The destructive item is Alert Salmon after a hairline divider. Opens with a 180ms scale-and-fade.

## Do's and Don'ts

### Do:
- **Do** keep cord red for the live connection only (cord, live socket rim, live ring, "Connected").
- **Do** set account names, emails, plans, times, paths and key numbers in Courier Prime; set interface text in Archivo.
- **Do** keep the terminal line and menu on the dark plate in both color schemes.
- **Do** give every jack a socket, a number key cap, and its state as text plus a dot, not color alone.
- **Do** use stroke SVG icons at 18px, 1.75 stroke, from the inline sprite.
- **Do** switch off all animation and transition under `prefers-reduced-motion`.

### Don't:
- **Don't** render accounts as a grey settings list with avatar circles.
- **Don't** use cord red for errors, warnings or destructive actions; use Alert Salmon.
- **Don't** raise the empty jack; it stays a flat dashed outline.
- **Don't** add a second signature motion; the cord redraw is the only one.
- **Don't** use Anthropic's logo or brand marks anywhere in the interface.
