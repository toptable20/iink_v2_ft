# Reference Website Style Guide

This guide summarizes reusable design patterns from the supplied reference CSS. Treat the values as a starting point for the website, and keep them scoped to the relevant page or component while integrating them with the current app.

## Source files

| File | Role in the reference site |
| --- | --- |
| `common.css` | Shared typography, resets, utility rules, and popup behavior |
| `index_pc.css` | Desktop home page and navigation layout |
| `index_tablet.css` | Tablet and intermediate-width adaptations |
| `index_mobile.css` | Compact layout adaptations |
| `jquery.fullpage.css` | FullPage section and navigation defaults |
| `swiper.min.css` | Swiper's bundled slider defaults |

The FullPage and Swiper files are vendor styles. Keep them separate from the site's visual tokens; only add narrowly scoped overrides when a component needs them.

## Visual direction

- Corporate, editorial layout with large photographic sections and clear, high-contrast headings.
- Main content alternates between dark navy sections and light neutral content areas.
- Use generous section spacing on desktop; reduce it and stack columns on compact screens.
- Keep navigation and slider controls visually quiet, with a brighter blue for the active or interactive state.

## Color palette

| Use | Reference value |
| --- | --- |
| Primary accent / active links | `#0d79ea` |
| Alternate blue accent | `#0e7ae9` |
| Deep navy section background | `#162233` |
| Dark blue background | `#0f1628` |
| Main text on light surfaces | `#111` or `#222` |
| Secondary text | `#555` or `#666` |
| Light surface | `#f5f5f5` or `#fff` |
| Dark surface | `#333` |
| Positive market movement | `#da1617` |
| Negative market movement | `#005bdd` |

The red and blue movement colors are specific to the reference site's market data display. Reuse them for that meaning only.

## Typography

- Body and Korean text use `NanumSquare`, with sans-serif fallbacks.
- English display headings and selected numeric labels use `Play`.
- The reference uses light weights around 300 for supporting copy, 400–600 for ordinary text, and 700 or bold for prominent headings.
- Desktop hero titles are large (about 68px in the supplied desktop stylesheet). Tablet and mobile rules reduce display sizes; keep headings responsive instead of carrying desktop sizes onto small screens.
- Supporting copy commonly uses 150–180% line height for readability.

Confirm the font files and the source encoding before copying font declarations. The reference CSS names the font families but does not include the font assets in the supplied set.

## Layout and components

### Header and navigation

- Desktop header is fixed at the top and begins over the hero with white navigation text.
- Scrolled or alternate header states switch to a white background with dark text and dark menu controls.
- Desktop navigation uses evenly spaced links; dropdown panels use light gray or white backgrounds with clear hierarchy.
- The full-screen navigation uses a split layout: a branded panel on the left and grouped navigation links on the right.

### Hero and sliders

- Hero sections fill the viewport and use cover-sized background photography.
- Center hero copy over the image and use white text with a restrained supporting paragraph.
- Slider pagination uses small outlined circles that fill white when active. Arrow controls sit beside the pagination.
- Preserve readable contrast with a suitable image overlay when the photograph is light or busy.

### Content sections

- Use `#162233` and `#0f1628` for major dark sections, paired with white headings and softened white body text.
- Use `#e9e9e9`, `#f5f5f5`, and white for light content areas.
- Feature cards use image backgrounds with short labels; the reference uses clipped corner treatment on some cards (`0 10px 0 10px`).
- News thumbnails keep a consistent aspect ratio and crop images with `object-fit: cover`.

### Footer

- Desktop footer places partner logos in a narrow column beside a dark information panel.
- On compact layouts, stack the partner and contact areas and reduce text sizes and spacing.

## Responsive behavior

The reference separates desktop, tablet, and mobile stylesheets. `index_mobile.css` contains a `max-width: 960px` media query; the tablet stylesheet contains several intermediate-width adjustments (including 1200px, 1300px, and 1399px). These are source-specific breakpoints, not a required breakpoint system for the new site.

At compact widths, the reference generally:

- Replaces horizontal desktop navigation with a compact menu.
- Stacks split sections vertically and lets each part use the available width.
- Reduces heading sizes, margins, and section padding.
- Repositions slider controls and hides some desktop-only supporting details.
- Turns multi-column feature and news layouts into fewer columns or a vertical flow.

Use the current app's responsive conventions when implementing these patterns, and check the intermediate widths as well as phone and desktop sizes.

## Integration notes for this project

The current frontend uses Tailwind and Geist in its global stylesheet, while the legacy page styles in this repository scope `KoPubWorldDotum` and bold text under `.iink-old`. The reference CSS uses `NanumSquare` and `Play`. Avoid changing global typography for the whole app; apply the reference look through a page-level wrapper or component styles after confirming which font assets are available.

The supplied styles also depend on image paths under `/images/common/` and `/images/main/`, and on FullPage/Swiper markup and JavaScript behavior. Those dependencies are not included in the CSS files themselves, so map the visual patterns to the assets and components present in the frontend rather than copying selectors blindly.
