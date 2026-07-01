---
name: ProjetPilote
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#43474e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f87'
  primary: '#022448'
  on-primary: '#ffffff'
  primary-container: '#1e3a5f'
  on-primary-container: '#8aa4cf'
  inverse-primary: '#adc8f5'
  secondary: '#006e2d'
  on-secondary: '#ffffff'
  secondary-container: '#7cf994'
  on-secondary-container: '#007230'
  tertiary: '#361f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#533200'
  on-tertiary-container: '#e39100'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#adc8f5'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#2d486d'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 40px
  gutter: 20px
---

## Brand & Style
The design system is engineered for high-stakes governance and international development. It prioritizes **reliability, transparency, and institutional authority**. The visual language is "Institutional Modern"—a blend of professional Corporate aesthetics with a focus on data density and clarity. 

The target audience includes government officials, NGO directors, and international donors who require a sense of stability and meticulous oversight. The UI evokes a feeling of structured progress, ensuring that complex financial and logistical data feels manageable and secure. We avoid decorative flourishes in favor of functional elegance and "airy" precision.

## Colors
The palette is rooted in **Deep Navy (#1E3A5F)** to project authority and trust, typical of diplomatic and financial institutions. 

- **Primary (Deep Navy):** Used for navigation, primary actions, and headers to establish the hierarchy of governance.
- **Positive Indicator (Emerald):** Reserved strictly for successful milestones, approved budgets, and "on-track" statuses.
- **Alert Tones (Orange/Red):** Used sparingly for risk management and budget overruns.
- **Neutrals:** A range of cool grays (Slate) provides the foundation for the data-dense environment, ensuring the background remains "quiet" while the data remains legible.

## Typography
We utilize **Inter** for its exceptional legibility in data-heavy tables and complex dashboards. The type scale is strictly hierarchical. 

- **Titles:** Use Semi-Bold or Bold weights with slight negative letter-spacing for a modern, compact feel.
- **Body Text:** Primarily set at 14px for standard data entry, scaling to 16px for reports.
- **Labels:** Small caps or medium-weight 13px text are used for table headers and form labels to differentiate metadata from user data.
- **Language Support:** All typography must support French diacritics (é, à, ç, etc.) without vertical alignment shifts.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid grid**. 
- **Desktop:** 12-column grid with a max-width of 1440px. Gutters are fixed at 20px. 
- **Density:** To accommodate large datasets (project budgets, timelines), we use an 8px base spacing unit but allow for "Compact" modes where 4px is the base for data tables.
- **Airiness:** Significant top and bottom margins (xl) are used between major sections to prevent cognitive overload, ensuring the "governance-focused" feel remains calm and organized.

## Elevation & Depth
This design system avoids harsh borders in favor of **Tonal Layers and Ambient Shadows**.

- **Surfaces:** The primary background is pure white. Secondary containers (sidebars, cards) use a soft background tint (Slate-50).
- **Shadows:** Use extremely soft, highly diffused shadows. An elevation-1 (Low) shadow is used for cards: `0px 1px 3px rgba(0,0,0,0.05), 0px 4px 6px rgba(0,0,0,0.02)`.
- **Depth:** Modal windows use a larger, tinted shadow to imply focus, but no "heavy" dark overlays. We prefer a soft backdrop blur (8px) to maintain the "Glassmorphism Lite" institutional feel.

## Shapes
A consistent **8px (0.5rem) radius** is applied to almost all interactive elements.

- **Cards & Inputs:** 8px radius provides a professional yet approachable look, softer than a 0px "government" style but more serious than "pill" shapes.
- **Status Pills:** Milestones and status indicators use a slightly higher 12px radius to distinguish them as "tags" rather than structural containers.
- **Icons:** Use 24px stroke-based icons with rounded terminals to match the font and corner radii.

## Components
- **Buttons:** Primary buttons are Solid Navy (#1E3A5F) with white text. Secondary buttons use a subtle Slate-100 background with Navy text. No "ghost" buttons for primary actions.
- **Inputs:** Use a soft Slate-200 border (1px) that turns Primary Navy on focus. Labels should always be visible above the field (no floating labels).
- **Data Tables:** These are the heart of the app. Use alternating row stripes (Zebra) in very light gray (#F8FAFC). Row height should be fixed at 48px for standard and 40px for compact.
- **Progress Bars:** Use a thick 8px track with the Positive Emerald color for successful completion.
- **Cards:** White background, 8px radius, Elevation-1 shadow, no border. Used to group related project metadata.
- **Status Chips:** High-contrast text on low-opacity backgrounds (e.g., Emerald text on light emerald background) for "En cours", "Terminé", or "En retard".
