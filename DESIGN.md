---
name: Leith
description: Member-only AI image creation breakdowns by @Superoutman. Playful, precise, self-aware.
colors:
    surface: "oklch(0.97 0.008 80)"
    surface-tint: "oklch(0.94 0.025 55)"
    ink: "oklch(0.15 0.008 60)"
    ink-secondary: "oklch(0.50 0.010 60)"
    terracotta: "oklch(0.62 0.14 47)"
    terracotta-deep: "oklch(0.52 0.14 47)"
    muted: "oklch(0.92 0.006 80)"
    border: "oklch(0.88 0.008 80)"
    destructive: "oklch(0.577 0.245 27.325)"
typography:
    display:
        fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
        fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
        fontWeight: 600
        lineHeight: 0.95
        letterSpacing: "-0.03em"
    headline:
        fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
        fontSize: "1.75rem"
        fontWeight: 600
        lineHeight: 1.1
        letterSpacing: "-0.02em"
    title:
        fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
        fontSize: "1.125rem"
        fontWeight: 500
        lineHeight: 1.25
        letterSpacing: "-0.01em"
    body:
        fontFamily: "Instrument Sans Variable, system-ui, sans-serif"
        fontSize: "1rem"
        fontWeight: 400
        lineHeight: 1.65
    label:
        fontFamily: "Instrument Sans Variable, system-ui, sans-serif"
        fontSize: "0.6875rem"
        fontWeight: 500
        letterSpacing: "0.01em"
rounded:
    none: "0"
    sm: "0.25rem"
    md: "0.375rem"
    lg: "0.625rem"
    full: "9999px"
spacing:
    xs: "4px"
    sm: "8px"
    md: "16px"
    lg: "24px"
    xl: "40px"
    2xl: "64px"
    3xl: "96px"
components:
    button-primary:
        backgroundColor: "{colors.terracotta}"
        textColor: "{colors.surface}"
        rounded: "{rounded.md}"
        padding: "10px 20px"
    button-primary-hover:
        backgroundColor: "{colors.terracotta-deep}"
    button-outline:
        backgroundColor: "transparent"
        textColor: "{colors.ink}"
        rounded: "{rounded.md}"
        padding: "10px 20px"
    button-ghost:
        backgroundColor: "transparent"
        textColor: "{colors.ink-secondary}"
        rounded: "{rounded.md}"
        padding: "10px 20px"
    badge-default:
        backgroundColor: "{colors.surface-tint}"
        textColor: "{colors.terracotta-deep}"
        rounded: "{rounded.sm}"
        padding: "2px 8px"
    badge-outline:
        backgroundColor: "transparent"
        textColor: "{colors.ink-secondary}"
        rounded: "{rounded.sm}"
        padding: "2px 8px"
    card:
        backgroundColor: "{colors.surface}"
        rounded: "{rounded.md}"
        padding: "24px"
    input:
        backgroundColor: "{colors.surface}"
        textColor: "{colors.ink}"
        rounded: "{rounded.md}"
        padding: "8px 12px"
    input-focus:
        backgroundColor: "{colors.surface}"
        textColor: "{colors.ink}"
        rounded: "{rounded.md}"
        padding: "8px 12px"
---

# Design System: Leith

## 1. Overview

**Creative North Star: "The Quiet Punch"**

Leith is a platform where restraint does the heavy lifting. Every screen is composed, almost dull, and then something lands: a proportion that's slightly off in a way that makes you pause, a color moment that doesn't need to announce itself, a heading weight that breaks the rhythm exactly once. The joke, when it exists, is quiet. The technique is always legible.

The visual system is built on warm aged-paper tones with a single terracotta accent used with deliberate scarcity. Space Grotesk brings character at display scale without performing: its quirky numerals and slightly odd uppercase letters are the personality. Instrument Sans carries the body copy with warmth and no fuss. Together, the pairing has personality without ego. Surfaces are almost flat. Shadows appear only when elevation is structurally required.

This system explicitly rejects: hype streetwear aggression (drop-culture red, type as assault), dark AI portal aesthetics (neon on black, glowing orbs), generic SaaS warmth (cream background, purple accent, rounded card grids, "Elevate your workflow"), and newsletter minimalism (pure white, wide margins, Georgia, Substack). None of those are wrong; they are just not this.

**Key Characteristics:**

- Warm paper base, not sterile white
- One accent color, used sparingly (the terracotta is earned each time it appears)
- Space Grotesk display with tight tracking; Instrument Sans body with generous leading
- Borderless where possible, `1px border` where structure is needed, no ambient shadows
- Near-flat radius (`0.375rem`) on interactive elements; layout containers have no radius

## 2. Colors: The Amber Archive Palette

A warm paper ground with a single terracotta moment. The palette is low-chroma across all neutrals; the accent earns its chromatic contrast precisely because nothing else competes.

### Primary

- **Terracotta** (`oklch(0.62 0.14 47)`): The single accent. Used on primary CTAs, active states, and one deliberate layout highlight per screen. Its warmth complements the paper base without fighting it.
- **Terracotta Deep** (`oklch(0.52 0.14 47)`): Hover/pressed state for terracotta elements. Also used for text-on-surface-tint contexts (tag labels, active nav indicators).

### Secondary

- **Surface Tint** (`oklch(0.94 0.025 55)`): Terracotta's closest neutral relative. Used for tag badge backgrounds, active row highlights, and hover fills on ghost buttons. A whisper of warmth, not a statement.

### Neutral

- **Surface** (`oklch(0.97 0.008 80)`): The page background. Warm off-white, like aged newsprint. Not `oklch(1 0 0)`. The hue tint (H=80, C=0.008) is invisible until you put it next to a neutral white; then the warmth is obvious.
- **Ink** (`oklch(0.15 0.008 60)`): Body text and primary foreground. Deep warm near-black. The same subtle hue tilt as Surface, which creates tonal cohesion across the range.
- **Ink Secondary** (`oklch(0.50 0.010 60)`): Supporting text, captions, meta, muted labels. Mid-toned warm gray.
- **Muted** (`oklch(0.92 0.006 80)`): Subtle background fills for secondary surfaces (input backgrounds at rest, table row alternates, sidebar).
- **Border** (`oklch(0.88 0.008 80)`): Dividers, input strokes, card borders. One step warmer than Muted.
- **Destructive** (`oklch(0.577 0.245 27.325)`): Error states and danger actions only. Never decorative.

### Named Rules

**The One Punch Rule.** Terracotta appears on at most one primary element per screen. Its rarity is the source of its punch. When it shows up everywhere, it becomes wallpaper.

**The Tinted Neutral Doctrine.** Surface and Ink are never pure white or pure black. Every neutral carries H=60-80 at C=0.006-0.010. This is the detail that separates "warm" from "generic."

## 3. Typography: Space Grotesk + Instrument Sans

**Display / Heading Font:** Space Grotesk Variable (`@fontsource-variable/space-grotesk`)
**Body Font:** Instrument Sans Variable (`@fontsource-variable/instrument-sans`)

**Note on installation:** Replace current `@fontsource-variable/figtree` and `@fontsource-variable/nunito-sans` with these two in `packages/ui`. Update `--font-heading` and `--font-sans` tokens in `globals.css`.

**Character:** Space Grotesk has distinct personality at large sizes: the `6`, `9`, and `G` have a slightly quirky geometry that reads as intentional rather than accidental. At body size it would be too much; that's Instrument Sans's register. Instrument Sans is warm, humanist, and reads well at 16-20px with generous leading. The pairing is: character at the top, legibility everywhere else.

### Hierarchy

- **Display** (600, `clamp(2.25rem, 5vw, 3.75rem)`, line-height 0.95, tracking -0.03em): Section heroes, landing page headline. Tight and tall. The tracking compression is deliberate; Space Grotesk's geometry fills in at this scale.
- **Headline** (600, `1.75rem`, line-height 1.1, tracking -0.02em): Post titles in the feed, page titles, creator dashboard headings. Still compressed, still Space Grotesk.
- **Title** (500, `1.125rem`, line-height 1.25, tracking -0.01em): Card headings, dialog titles, section sub-headers. The step where Space Grotesk transitions from display to functional.
- **Body** (400, `1rem`, line-height 1.65): All post body copy. Max line length 65-72ch enforced in the post layout. Instrument Sans, warm, readable, no letter-spacing.
- **Label** (500, `0.6875rem`, line-height 1.4, tracking +0.01em): Tags, badges, meta dates, nav items, table headers. Instrument Sans caps at small scale.

### Named Rules

**The Compression Rule.** Display and Headline always have negative tracking. Any Space Grotesk heading above `1.25rem` that doesn't have `letter-spacing: -0.02em` or tighter has not been set; it has been pasted.

**The Single Family Rule.** Space Grotesk is the heading font. Instrument Sans is the body font. No third typeface is introduced, including monospace. Code snippets inside post bodies use `font-family: inherit` with a subtle background tint, not a separate mono font.

## 4. Elevation

Flat by default. This system does not use ambient shadows to create depth. All surfaces share the same warm paper ground; depth comes from tonal layering (Surface vs. Muted vs. Surface Tint) and spacing, not from z-axis shadow.

The single exception: floating UI elements (dropdowns, tooltips, popovers, the command palette) receive one structural shadow to communicate "I am above the document." It uses a warm tint, not a neutral gray.

### Shadow Vocabulary

- **Float** (`0 4px 20px oklch(0.15 0.008 60 / 0.12)`): Dropdowns, popovers, tooltips, the sidebar on mobile. Warm near-black at 12% opacity, spread wide, offset small. Communicates "floating above" without visual noise.
- **Lift** (`0 2px 8px oklch(0.62 0.14 47 / 0.15)`): Reserved for one deliberate use per layout: the primary CTA button on the landing hero, on hover only. A terracotta-tinted glow. The quiet punch.

### Named Rules

**The No Ambient Shadow Rule.** Cards, sections, containers, and panels are never shadowed at rest. If a surface needs to look elevated, use a `1px border-border` instead. Shadows at rest are the SaaS reflex. This is not SaaS.

## 5. Components

### Buttons

Compact, almost-flat, no outer glow at rest.

- **Shape:** Near-square (0.375rem radius), described as "rounded but businesslike." The radius is there for friendliness, not for personality.
- **Primary:** Terracotta background (`oklch(0.62 0.14 47)`), Surface text, `10px 20px` padding, `0.6875rem` label. Hover: Terracotta Deep background + Lift shadow. Active: `-1px` translateY.
- **Outline:** `1px border-border`, transparent background, Ink text. Hover: Muted fill. Used for secondary actions.
- **Ghost:** No border, no background, Ink Secondary text. Hover: Surface Tint fill. Used for tertiary and nav-level actions.
- **Disabled:** 50% opacity on any variant. No distinct color swap.

### Badges / Tags

Used for post tags, status indicators, content category labels.

- **Default:** Surface Tint background, Terracotta Deep text, `0.25rem` radius, `2px 8px` padding. The closest the badge gets to the accent without using it directly.
- **Outline:** `1px border-border`, transparent background, Ink Secondary text. For neutral metadata (dates, reading time).
- **No fully-round (pill) badges on non-status elements.** The `border-radius: 9999px` shape is reserved for live-status dots and avatar presence indicators only.

### Cards / Containers

- **Corner Style:** `0.375rem` radius (same as buttons). Consistent feel; nothing has unexpectedly soft corners.
- **Background:** Surface (`oklch(0.97 0.008 80)`). Cards share the page background; they are not elevated above it.
- **Shadow Strategy:** None at rest. Apply `1px border-border` to define the card boundary when needed. Not every container needs a border; negative space is a valid boundary.
- **Internal Padding:** `24px` default. `16px` for compact variants (sidebar panels, metadata cards). Never below `12px`.
- **Post cover images inside cards** use a `0.375rem 0.375rem 0 0` top-radius-only treatment, flush with the card edge.

### Inputs / Fields

- **Style:** Surface background, `1px border-border` at rest, `0.375rem` radius, `8px 12px` padding. No shadow, no fill change at rest.
- **Focus:** `border-color: terracotta`, `ring: 2px oklch(0.62 0.14 47 / 0.20)`. The terracotta focus ring is the one place the accent enters the form layer.
- **Error:** `border-color: destructive`, `ring: 2px oklch(0.577 0.245 27.325 / 0.20)`.
- **Disabled:** 50% opacity, `pointer-events: none`, `cursor: not-allowed`.

### Navigation

- **Style:** Ghost-button level styling on nav links. No underlines at rest. Ink Secondary text. Hover: Surface Tint fill at `0.25rem` radius.
- **Active state:** Terracotta Deep text weight 600, no background. The single terracotta text moment in the nav.
- **Mobile:** Collapses into a Sheet (bottom-anchored drawer). The nav inside the sheet is full-width, generous spacing.

### Post Lock Card (Signature Component)

The teaser card shown on the public landing page. A post card with its cover image blurred at 12px and a centered lock indicator over it.

- **Cover area:** Full-bleed top image at `aspect-ratio: 16/9`, `filter: blur(12px) brightness(0.8)`, `overflow: hidden`.
- **Lock indicator:** A centered `40px` circle in Surface Tint with a lock icon in Ink Secondary, absolutely positioned over the blurred cover. No border, no shadow.
- **Card footer:** Post title (Title scale, Ink, unblurred), tags row (Badge outline variants).
- **Hover:** The blur reduces to `8px` with a `200ms` ease-out transition. A small Surface Tint overlay fades in at the top of the card reading "Members only." Nothing else moves.

## 6. Do's and Don'ts

### Do:

- **Do** use `oklch` for all color values in `globals.css`. The canonical format is OKLCH; no hex in the CSS layer.
- **Do** tint every neutral. Surface is `oklch(0.97 0.008 80)`, not `oklch(1 0 0)`. Ink is `oklch(0.15 0.008 60)`, not `oklch(0.147 0.004 49.25)`. The chroma is 0.006-0.010, not 0.
- **Do** use Space Grotesk at negative tracking for any heading above `1.125rem`. `-0.02em` minimum; `-0.03em` at display scale.
- **Do** enforce max line length in post body copy. `max-width: 68ch` on the prose container.
- **Do** use `1px border-border` as the primary depth signal on cards. Prefer it over shadows.
- **Do** keep the terracotta accent scarce. One primary element per screen. Its presence should be a decision, not a default.
- **Do** use Surface Tint (`oklch(0.94 0.025 55)`) for hover fills, tag backgrounds, and active row states. It is the terracotta-adjacent neutral: related without competing.
- **Do** use `min-h-[100dvh]` instead of `h-screen` for full-height hero sections.
- **Do** use asymmetric layouts on the landing page. A centered hero is the first reflex; reject it.

### Don't:

- **Don't** use hype streetwear energy. No aggressive red, no drop-culture type treatment, no Supreme-style uppercase-everything. Leith is precise and self-aware, not confrontational.
- **Don't** use dark AI portal aesthetics. No neon on black, no glowing orbs, no Midjourney-style visual language. The platform is about craft, not about selling AI.
- **Don't** use generic SaaS patterns: no cream background with purple accent, no identical rounded card grids, no "Elevate your workflow" copywriting, no hero metric templates (big number, gradient accent).
- **Don't** use newsletter minimalism. Pure white background, Georgia serif, Substack-like restraint: that is the opposite of the "quiet punch." Restraint here means _precise_ weirdness, not the absence of personality.
- **Don't** use `border-left` or `border-right` greater than `1px` as a colored accent. Side-stripe borders are a banned pattern.
- **Don't** apply `background-clip: text` with a gradient. No gradient text.
- **Don't** add ambient shadows to cards or sections at rest. The No Ambient Shadow Rule is absolute.
- **Don't** use more than one typeface. Space Grotesk + Instrument Sans is the system. A third font, including monospace, is not introduced.
- **Don't** use `oklch(1 0 0)` or `oklch(0 0 0)` as-is. Every neutral must carry a hue tilt.
- **Don't** animate `top`, `left`, `width`, or `height`. Animate `transform` and `opacity` only.
- **Don't** use pill-shaped (`border-radius: 9999px`) buttons. That softness belongs to status dots and avatars; buttons are near-square.
