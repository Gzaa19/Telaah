---
name: Academic Editorial Canvas
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#434655'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#36455b'
  on-tertiary: '#ffffff'
  tertiary-container: '#4d5d73'
  on-tertiary-container: '#c5d6f0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 2.75rem
    fontWeight: '500'
    lineHeight: 3.25rem
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Newsreader
    fontSize: 2rem
    fontWeight: '500'
    lineHeight: 2.5rem
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 1.625rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Newsreader
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
  body-lg:
    fontFamily: Inter
    fontSize: 1.0625rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.375rem
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system targets researchers, principal investigators, technical authors, and scholars managing dense literature graphs, computational notebooks, and formal manuscripts. The design aesthetic is an **Editorial Academic Canvas**—a disciplined union of literary precision and modern computational productivity, drawing inspiration from high-grade publication tools, archival library interfaces, and distraction-free document workspaces.

The visual tone is rigorous, quiet, and deliberate. Interfaces prioritize typographic hierarchy and text legibility over decorative noise. UI controls remain unobtrusive until focused, yielding center stage to research artifacts, mathematical expressions, citations, and analytical telemetry. The interface relies on warm-paper canvas tiers, hairline structural framing, deep archival ink for content, and academic royal blue for deliberate interactive emphasis.

## Colors

The palette establishes an authentic scholarly workspace with three primary roles: paper surfaces, archival ink, and deliberate semantic signals.

- **Primary (`#1D4ED8`)**: Academic Royal Blue. Reserved strictly for primary calls-to-action, text selection highlights, active manuscript tabs, and focused citation nodes.
- **Secondary (`#059669`)**: Archival Emerald. Dedicated to publication indexing statuses (e.g., PubMed, Scopus, arXiv, DOI resolved), active computational kernels, and verified peer review tags.
- **Tertiary (`#64748B`)**: Muted Slate. Used for metadata labels, LaTeX line numbers, secondary attributions, and peripheral utility elements.
- **Neutral (`#191919`)**: Deep Carbon Ink. High-contrast, non-glare ink for primary headings and running body text.
- **Canvas Surfacing**:
  - Base Document Canvas: `#FBFBFB` (warm parchment base)
  - Sidebar & Inspector Panels: `#F7F6F3` (warm-grey paper)
  - Interactive Card & Data Blocks: `#FFFFFF`
  - Subtle Borders & Hairlines: `#E5E7EB` (neutral structural rule)

## Typography

The typography couples literary cadence with technical precision:

- **Editorial Serif (`Newsreader`)**: Anchors document titles, abstract lead-ins, manuscript section headers, and thesis displays. Its optical balancing guarantees warm readability at text sizes and authoritative presence in large titles.
- **Utilitarian Interface (`Inter`)**: Handles reading copy, contextual commentary, control labels, navigation menus, and metadata tables. Its neutral geometric nature eliminates eye fatigue across data-heavy sessions.
- **Monospace Workhorse (`JetBrains Mono`)**: Manages citation keys, BibTeX fragments, mathematical symbols, vector dimensionalities (`pgvector`), DOIs, and algorithmic source blocks.

## Layout & Spacing

The layout model implements a three-pane asymmetric canvas designed for scholarly workflow efficiency:
- **Left Panel (Navigation / Repository Index)**: Collapsible, 260px fixed width, background `#F7F6F3`.
- **Center Canvas (Manuscript / Document Core)**: Fluid width constrained to a maximum reading column of 720px for single-column text or 1120px for dual-pane analytical views.
- **Right Panel (Contextual Inspector / Citation Inspector / Graph Data)**: 340px fixed width, toggled on demand.

The spatial scale is grounded in an 8px base rhythm (`space-xs` = 4px, `space-sm` = 8px, `space-md` = 16px, `space-lg` = 24px, `space-xl` = 40px). 
- **Breakpoints**: 
  - Mobile (`< 768px`): Single column view. Left and right panels collapse into slide-out bottom sheets. Gutters drop to `1.25rem`, outer margins to `1rem`.
  - Tablet (`768px - 1024px`): Left navigation docks as a 64px compact icon rail; center workspace auto-expands.
  - Desktop (`> 1024px`): Full multi-pane editorial layout with permanent hairline dividers.

## Elevation & Depth

Visual hierarchy rejects exaggerated drop shadows in favor of **Tonal Layers and Crisp Hairline Boundaries**:

- **Layer 0 (App Shell & Navigation)**: Rendered in `#F7F6F3` to delineate navigational context from the manuscript.
- **Layer 1 (Reading & Writing Canvas)**: Crisp `#FBFBFB` surface framed by a 1px border (`#E5E7EB`).
- **Layer 2 (Floating Cards, Popovers, Citation Previews)**: Solid `#FFFFFF` surface bordered by a 1px `#E2E8F0` frame, supported by an ultra-subtle ambient lift: `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Modal Layers**: Solid `#FFFFFF` backdrops with a backdrop blur overlay (`rgba(247, 246, 243, 0.8)`).
- **Dividers & Grid Lines**: All panel boundaries use a precise 1px solid stroke (`#E5E7EB`). Never rely on blur or soft drop shadows to define structural edges.

## Shapes

The geometric signature uses tight, disciplined radii (`roundedness: 1`):
- **Base Components**: 4px border radius (`0.25rem`) applied to input fields, buttons, reference chips, and tooltips.
- **Panels & Overlays (`rounded-lg`)**: 8px (`0.5rem`) for floating modals, popover cards, and citation reference dialogs.
- **Document Viewport (`rounded-xl`)**: 12px (`0.75rem`) for embedded media frames and isolated canvas containers.
- **Inline Badges & Citation Pills**: Maintain the uniform 4px corner geometry to preserve the physical index-card character rather than circular pills.

## Components

### Buttons
- **Primary**: Solid `#1D4ED8` background, white label, 4px border radius, 32px height for standard interface actions (`px-3 py-1.5`). Hover: `#1E40AF`.
- **Secondary / Ghost**: Transparent background with a 1px `#E5E7EB` border and `#191919` text. Hover: `#F7F6F3` background with `#0F172A` text.
- **Text / Inline Reference**: No border or background. `#1D4ED8` text with subtle underline on hover; monospaced bracket indicators (e.g., `[1]`, `[arXiv:2401.09]`).

### Chips & Reference Tags
- **Citation Badges**: Rendered in `#JetBrains Mono`, 12px font size. Subtle `#F1F5F9` background, 1px `#E2E8F0` border, `#475569` text.
- **Indexing & Status Badges**: Background `#ECFDF5`, 1px `#A7F3D0` border, `#065F46` label with a 6px solid green status pip for verified publications.

### Input Fields & Search Bars
- Background `#FFFFFF`, 1px solid `#E5E7EB` border, 4px corner radius. Placeholder text in `#94A3B8`.
- Focus state: Replaces border with 1px `#1D4ED8` and applies an ambient `0 0 0 1px #1D4ED8` inner ring without outer glow.

### Lists & Citations
- Line items feature a 36px height with 1px bottom hairpins (`#F1F5F9`).
- Active items use a `#F7F6F3` fill with an academic royal blue 2px left-accent border indicator.

### Checkboxes & Radios
- Square 16px geometry with a 2px radius. Neutral state: 1.5px `#CBD5E1` border on `#FFFFFF`.
- Selected state: `#1D4ED8` fill with a crisp white tick or center node.

### Cards & Abstract Previews
- Background `#FFFFFF`, 1px border `#E5E7EB`, padding `1.25rem`. Headings in `Newsreader`, followed by muted metadata row in `JetBrains Mono` and abstract excerpt in `Inter`.

### Monospace Code & Formula Blocks
- Contained block with `#F8FAFC` background, 1px border `#E2E8F0`. Line numbers in `#94A3B8` aligned left, syntax highlighted with archival ink tones.
