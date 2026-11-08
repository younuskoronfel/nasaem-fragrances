---
name: Nasaem Fragrances
description: A golden scent garden that leads visitors from instinct to fragrance.
colors:
  silk: "#f0d4a7"
  paper: "#f4dfbe"
  ink: "#382316"
  muted: "#63472e"
  bronze: "#74471b"
  dark: "#372319"
  gold: "#f4cc8e"
  guide: "#47291d"
  answer: "#f9e5c2bd"
  answer-hover: "#ffeccc"
  match: "#f4d8aaf0"
  chip: "#e8c89b"
  chip-hover: "#e4b77e"
  action-hover: "#643b23"
typography:
  display:
    fontFamily: "Cormorant, Georgia, serif"
    fontSize: "clamp(4.2rem,6.45vw,6rem)"
    fontWeight: 500
    lineHeight: 0.89
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Cormorant, Georgia, serif"
    fontSize: "clamp(3.65rem,7vw,5.6rem)"
    fontWeight: 600
    lineHeight: 0.96
    letterSpacing: "-.035em"
  question:
    fontFamily: "Cormorant, Georgia, serif"
    fontSize: "clamp(2.1rem,3.5vw,3.15rem)"
    fontWeight: 600
    lineHeight: 0.96
    letterSpacing: "-.035em"
  title:
    fontFamily: "Cormorant, Georgia, serif"
    fontSize: "clamp(1.55rem,2.35vw,2.35rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-.025em"
  body:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  step-label:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: ".77rem"
    fontWeight: 600
    letterSpacing: ".13em"
rounded:
  thumb: ".35rem"
  answer: ".65rem"
  portrait: ".7rem"
  disclosure: ".72rem"
  dialog: "1.05rem"
  action: "3rem"
  chip: "4rem"
  circle: "50%"
spacing:
  wrap-gutter: "clamp(2.5rem,9vw,9rem)"
  collection-inset: "clamp(4.2rem,8vw,7.5rem)"
  section-inset: "clamp(4rem,8vw,7rem)"
components:
  button-dark:
    backgroundColor: "{colors.dark}"
    textColor: "{colors.paper}"
    rounded: "{rounded.action}"
    padding: ".75rem 1.2rem"
  button-dark-hover:
    backgroundColor: "{colors.action-hover}"
  finder-answer:
    backgroundColor: "{colors.answer}"
    textColor: "{colors.ink}"
    rounded: "{rounded.answer}"
    padding: ".45rem .72rem .45rem .46rem"
  finder-answer-hover:
    backgroundColor: "{colors.answer-hover}"
  finder-match:
    backgroundColor: "{colors.match}"
    textColor: "{colors.ink}"
    rounded: "{rounded.answer}"
    padding: ".55rem"
  mood-chip:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: ".35rem .96rem"
  mood-chip-hover:
    backgroundColor: "{colors.chip-hover}"
  mood-chip-selected:
    backgroundColor: "{colors.dark}"
    textColor: "{colors.paper}"
  site-navigation:
    textColor: "{colors.ink}"
    height: "6.3rem"
  fragrance-card:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
  scent-guide:
    backgroundColor: "{colors.guide}"
    textColor: "{colors.paper}"
  fragrance-detail:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    width: "min(54rem,100% - 2rem)"
---

# Design System: Nasaem Fragrances

## Overview

**Creative North Star: "The Golden Scent Garden"**

The pinned gold reference sets the palette for an illustrated garden. Honey-colored light holds the image and interface together, with a graduated veil behind the text. The supplied gold wordmark and English display type anchor the opening composition.

The scent finder asks about scent preferences, mood, and occasion and changes the scenery as visitors answer. It leads to two fragrance recommendations while keeping a direct path to the collection. Painted portraits carry the collection, with fragrance names and mood labels set below the artwork.

**Key Characteristics:**

- Gold light, softly layered garden scenes, and warm brown ink.
- The supplied gold wordmark and expressive Cormorant display type.
- Three brief questions, two suggested fragrances, and optional browsing.
- Border-free, full-length painted fragrance portraits.

## Colors

### Primary

- **Golden Silk** backs the garden. **Gilded Bronze** identifies emphasized hero text, and the mood family in the fragrance detail.
- **Candlelight Gold** highlights the guide's italic words and disclosure indicators.

### Neutral

- **Honey Paper** carries the collection and detail surfaces. **Warm Ink** and **Soft Umber** carry primary and supporting text.
- **Dark Amber** fills selected chips and primary actions. **Cocoa** gives the guide its own dark ground.
- **Sheer Cream** and **Pale Honey** fill finder answers and recommendations. **Cream Light** marks a hovered answer or recommendation.
- **Wheat** and **Toasted Wheat** distinguish default and hovered chips. **Roasted Bronze** marks a hovered dark action.

## Typography

Cormorant carries hero and section headings, finder questions, card names, and guide disclosures. Its italic gives the display line a shift in emphasis. The supplied wordmark remains artwork, recolored in gold with an SVG filter. DM Sans carries reading copy, controls, navigation, and progress labels.

## Layout

The finder occupies the opening canvas beneath the overlaid navigation. A fluid wrapper caps at 79rem. Answers use two columns. Recommendations use two columns and stack at 620px or below. The portrait grid uses four columns above 850px, three between 621px and 850px, and two at 620px or below. At the smaller breakpoint the guide and fragrance detail stack vertically, the hero artwork fills the scene behind the finder, and the Instagram link shows its icon.

## Elevation & Depth

Gradients keep text legible while revealing the garden. Translucent answer tiles and painted portraits use small warm shadows that deepen on hover. A tinted backdrop isolates the fragrance detail.

The garden briefly releases points of light on load. It crossfades to painted mood scenes and follows fine pointer movement. Reduced motion hides the drifting lights, disables CSS animations and transitions, and bypasses pointer-driven movement.

## Shapes

Choice tiles, portraits, disclosures, and the detail use softly rounded corners. Chips and primary actions use pill shapes. The card arrow and close control are circular. Small diamonds indicate progress.

## Components

### Navigation and actions

The supplied gold wordmark anchors the left side, section links sit in the middle, and Instagram sits on the right. Use dark pills for primary actions and underlined text for secondary finder navigation. Interactive controls use a visible offset focus outline.

### Scent finder

Four illustrated answers follow each question. Selecting an answer advances the finder and changes the background scene. The Back action revisits earlier questions. Two illustrated recommendations open the same fragrance detail as the collection. The results offer a fresh start, and Browse all perfumes stays available throughout.

### Mood filters

A dark fill marks the active chip. The All scents chip resets the four mood filters, and the live count tracks the collection.

### Fragrance card and detail

The card uses a full 4:5 portrait, a Cormorant name, a visible mood label, and a circular arrow. The portrait lifts on hover or keyboard focus. The native dialog pairs the full artwork with the fragrance copy. Visitors can close it with the close button, Escape, or a click on the backdrop.

### Scent guide

A warm, translucent row opens to reveal a small illustration and explanatory text. The amber plus becomes a minus while the row is open.

## Do's and Don'ts

### Do

- Do keep the garden visible through a veil that supports readable text.
- Do keep direct collection browsing available alongside the finder.
- Do keep the portrait in full and the fragrance mood visible.
- Do preserve the reduced-motion treatment.

### Don't

- Don't crop the painted portraits or frame them with borders.
- Don't make the artwork change the only indication that a finder step has advanced.

## Bottle motion and luminous portraits

The garden opens into a dark painted atelier. Passive scroll turns the glass, lifts the cap, closes in on the atomizer, disperses the mist, then settles the bottle. Motion is tied to the six headings and reverses when visitors scroll back. Mobile keeps the bottle above the chapter text with an opaque painted stage. A static artwork replaces the stage for reduced motion.

Gallery portraits retain their full proportions. Their highlights take color from the scent families. The glow sits behind the artwork, and a restrained reflection follows the pointer. Smaller scroll effects link the garden, gallery, guide, and contact section to the same motion language.
