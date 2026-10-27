---
name: Emtiaz
description: Arabic-first cohort LMS for Oman — warm paper, Gulf teal, terracotta attention.
colors:
  primary: "#0F766E"
  primary-dark: "#134E4A"
  primary-light: "#CCFBF1"
  secondary: "#EA580C"
  secondary-light: "#FFEDD5"
  background: "#FAF8F5"
  surface: "#FFFFFF"
  line: "#E7E5E4"
  ink: "#1C1917"
  ink-soft: "#57534E"
typography:
  display:
    fontFamily: "Cairo, Readex Pro, sans-serif"
    fontSize: "clamp(32px, 4.6vw, 54px)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0em"
  headline:
    fontFamily: "Cairo, Readex Pro, sans-serif"
    fontSize: "clamp(24px, 3.4vw, 38px)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0em"
  title:
    fontFamily: "Cairo, Readex Pro, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0em"
  body:
    fontFamily: "Cairo, Readex Pro, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0em"
  label:
    fontFamily: "Cairo, Readex Pro, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
  body-latin:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0em"
rounded:
  sm: "10px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  full: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "56px"
  "3xl": "72px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  chip:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  nav-link-hover:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary-dark}"
---

# Design System: Emtiaz

## Overview

**Creative North Star: "The Majlis"**

Emtiaz should feel like a majlis: a calm, generous room where a teacher hosts students and parents. Warm sand paper, white surfaces, and one-pixel stone borders hold the content. The interface is the furniture, not the decoration — nothing floats or glows, and state is expressed through border and color rather than shadow.

The palette carries the hospitality. Gulf teal is the host: the color of the room and of every action that moves learning forward. Terracotta is the coffee pot — a warm accent kept for the one thing that needs attention. Typography is Arabic-first: Cairo sets the voice, DM Sans is its Latin twin, and English is a mode of the same room, not a translation of it.

Density is comfortable rather than airy. Phone-first tap targets, 16px body text, and 1.65 line-height give a parent enough rhythm to scan a gradebook without instructions.

**Key Characteristics:**
- Warm sand ground (`#FAF8F5`), white cards, and 1px stone borders; no shadows anywhere.
- Gulf teal (`#0F766E`) for navigation, primary actions, links, and progress.
- Terracotta (`#EA580C`) on no more than 10% of a screen, marking a single point of attention.
- Rounded but not bubbly: 12px controls, 16–20px containers, full pills for status.
- Arabic-first RTL with a mirrored English mode.
- Comfortable phone density: 48px minimum controls and generous line-height.

## Colors

A warm, trust-building palette: cool teal for guidance, terracotta for warmth, sand and stone for calm.

### Primary
- **Gulf Teal** (`#0F766E`): links, primary buttons, progress fill, active markers, step numbers. The default action color across teacher, student, and parent views.
- **Gulf Teal Deep** (`#134E4A`): headings, logo, primary hover, and the landing pricing band. One step darker for emphasis, never for body text.
- **Mint Wash** (`#CCFBF1`): icon tiles, chips, nav hover, selection, and quiet accents. Background role only.

### Secondary
- **Terracotta Ember** (`#EA580C`): focus ring, the single warm call to action, featured-plan outline, and lesson accents. Attention, not decoration.
- **Apricot Wash** (`#FFEDD5`): alert backgrounds and the landing hero underline. A warm surface that never carries long text at low contrast.

### Neutral
- **Warm Sand** (`#FAF8F5`): the page ground everywhere.
- **Surface White** (`#FFFFFF`): cards, inputs, selects, and navigation panels.
- **Stone Line** (`#E7E5E4`): every border, divider, locked dot, and progress track.
- **Ink** (`#1C1917`): primary text.
- **Soft Ink** (`#57534E`): labels, metadata, and secondary copy.

### Named Rules
**The One Warm Accent Rule.** Terracotta covers ≤10% of any screen. It marks the one thing the user should notice; using it twice dilutes it to decoration.

**The Border-Not-Shadow Rule.** Depth is a 1px stone border on warm paper. No box-shadows, glows, or glassmorphism anywhere in the system.

## Typography

**Display Font:** Cairo (with Readex Pro, sans-serif)
**Body Font:** Cairo (with Readex Pro, sans-serif); English mode uses DM Sans
**Character:** Cairo's open, humanist Arabic counters keep long lesson text readable on a phone; DM Sans is its quiet Latin counterpart. The pairing is warm and legible, never editorial or decorative.

### Hierarchy
- **Display** (700, `clamp(32px, 4.6vw, 54px)`, 1.25): landing hero headlines only.
- **Headline** (700, `clamp(24px, 3.4vw, 38px)`, 1.25): landing sections and app page titles.
- **Title** (700, 18px, 1.35): card headings, lesson titles, group names.
- **Body** (400, 16px, 1.65, max 65–75ch): lessons, descriptions, forms, gradebook cells.
- **Label** (600, 13px, 0.02em): field labels, metadata, table headers, badge text.
- **English mode:** DM Sans at the same sizes and weights; the switch changes family and direction, not the scale.

### Named Rules
**The Arabic-First Rule.** Start every text style in Arabic and RTL. English inherits the same sizes, weights, and line-height; it may never compress the Arabic setting to fit.

**The Two-Step Weight Rule.** Use 400 for reading and 600–700 for emphasis. No light weights; they disappear on a phone in daylight.

## Layout

The app is a single column capped at 768px (`max-w-3xl`) with 16px page padding and 96px bottom clearance for phone navigation. The landing page uses a 1120px wrap with 20px side padding and a 72px section rhythm, reduced to 52px below 560px.

Landing grids use `auto-fit` with 270px feature cards, 240px steps, and 220px compact cards. The hero is a two-column `1.05fr / 0.95fr` grid at a 56px gap; it collapses to one column at 900px, where the parents section also stacks and the inline nav links disappear. At 560px the hero padding tightens, featured plans lose their scale, and CTAs become full width.

Spacing follows an 8px rhythm (`4 / 8 / 12 / 16 / 24 / 32 / 56 / 72`). Inside cards the default padding is 20px in the app and 24px on the landing page, with 8–12px between stacked rows. Controls are at least 48px tall everywhere.

## Elevation & Depth

This system is flat by default. There are no shadows. Depth is conveyed by tonal layering — white surfaces on warm sand, mint wash on white — held together by 1px stone borders. Hover and focus change border color and background, never elevation: no lift, no glow, no drop shadow.

The landing page still carries a legacy teal-tinted shadow (`0 10px 30px -12px rgb(19 78 74 / 0.25)`) on cards, buttons, and the phone mock. Treat it as drift to remove, not as a system token.

### Named Rules
**The Flat-By-Default Rule.** A surface that needs to stand out gets a border or a tonal fill, not a shadow.

## Shapes

Form language is soft and modular. Controls use a 12px radius, app cards and containers 16px, landing containers 20px, the hero mock 22px, and the final CTA panel 28px. Full 999px pills are reserved for status, counts, eyebrows, and tags; avatars, step numbers, check marks, and progress bars are circles or fully rounded.

Borders are always 1px solid stone. Dashed borders are reserved for inline dividers and the pricing bundle. Radii nest concentrically: an inner element's radius is the outer radius minus the gap between them.

### Named Rules
**The Concentric Corner Rule.** Never place a 12px control inside a 16px card flush to its edge; either inset it by at least 4px or reduce the inner radius so the corners read as parallel.

## Components

### Buttons
- **Shape:** gently curved (12px), minimum 48px tall in the app.
- **Primary:** Gulf Teal fill, white text, 600 weight, 12px × 20px padding; hover deepens to Gulf Teal Deep.
- **Secondary:** Terracotta fill for the one warm action; same shape and weight.
- **Ghost:** transparent with a 1px stone border and ink text; hover fills with a soft stone tint.
- **Hover / Focus:** color and border shifts only — no lift or shadow. Global focus is a 3px terracotta outline with 2px offset.

### Inputs / Fields
- **Style:** 12px radius, 1px stone border, white fill, 48px minimum height, 12px × 16px padding.
- **Label:** 13px, 600 weight, Soft Ink, placed above the field.
- **Focus:** border shifts to Gulf Teal; no glow or shadow.
- **Error:** Apricot Wash surface with Ink text; errors are announced, not only colored.

### Cards / Containers
- **Corner Style:** 16px in the app, 20px on the landing page.
- **Background:** Surface White on Warm Sand.
- **Border:** 1px Stone Line; hover may shift the border toward Mint Wash on marketing cards.
- **Internal Padding:** 20px app / 24px landing.
- **Shadow Strategy:** none — see Elevation & Depth.

### Chips
- **Style:** Mint Wash background, Gulf Teal Deep text, full radius, 4px × 10px padding, 11–13px 700.
- **Variants:** terracotta fill is reserved for featured tags and single attention badges; stone/grey is not a chip color.

### Navigation
- **Style:** sticky on the landing page with a translucent Warm Sand backdrop and blur; the app uses an in-page header instead.
- **Links:** Soft Ink, 600, 14.5px, 8px × 12px padding, 10px radius; hover fills Mint Wash and turns Gulf Teal Deep.
- **Mobile:** inline links hide below 900px; primary navigation moves to the app's bottom bar with 48px targets.

### Progress
- **Style:** 6–8px track in Stone Line, teal fill, fully rounded. The landing variant may use a teal-to-turquoise gradient; the app stays a flat teal fill.
- **Behavior:** always paired with a numeric or text label, never a bare bar.

## Do's and Don'ts

### Do:
- **Do** place white cards on Warm Sand and separate them with 1px `#E7E5E4` borders.
- **Do** keep terracotta to one attention point per screen.
- **Do** design Arabic and RTL first, then mirror spacing and icons for English.
- **Do** keep every phone control at least 48px tall.
- **Do** use 12px radii for controls and 16–20px for containers.
- **Do** use the 3px terracotta focus outline with 2px offset on every interactive element.

### Don't:
- **Don't** add shadows, glows, gradients-as-depth, or glassmorphism.
- **Don't** use terracotta as a large fill or a second primary color.
- **Don't** set body text below 16px on mobile.
- **Don't** substitute pure black or cool grey; Ink (`#1C1917`) and Stone (`#E7E5E4`) are warm.
- **Don't** write English first and translate into Arabic; Arabic is the source language.
