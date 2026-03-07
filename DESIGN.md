# Design System: SyndicPulse — Direction Marocain Premium
**Version:** 1.0 — Warm Sand × Or Brûlé
**App:** SyndicPulse · Gestion de Copropriété · Maroc
**Last updated:** 2026-03-06

---

## 1. Visual Theme & Atmosphere

SyndicPulse speaks the visual language of a high-end Marrakech riad: warm, earthy, and unmistakably premium. The atmosphere is **luminous and structured** — a warm sand canvas holds crisp white floating cards, while a deep terracotta sidebar acts as a grounding anchor. The result is neither cold enterprise software nor playful consumer app, but something in between: a tool that feels *built for Morocco*, trustworthy enough for property owners and refined enough for syndic professionals.

**Mood keywords:** Warm · Premium · Structured · Moroccan · Earthy · Luminous · Trustworthy

The signature detail is the **zellige diamond grid** — a geometric SVG pattern drawn from traditional Moroccan tilework, applied at low opacity (5–12%) to backgrounds. It is never on cards (which stay clean white) — only on expanses of background or the sidebar.

---

## 2. Color Palette & Roles

| Name | Hex | Role |
|---|---|---|
| **Deep Terracotta** | `#2d1b0e` | Sidebar background, login left panel — the dark anchor of the layout |
| **Scorched Terracotta** | `#0f0704` | Page background in full dark mode (unused in light theme) |
| **Warm Sand** | `#f5f0e8` | Main page background in light theme — warm, not cold |
| **Warm Cream** | `#faf8f4` | Login right panel, form backgrounds |
| **Burnished Gold** | `#c9972a` | Primary accent: active nav, KPI numbers, progress bars, CTAs, badges |
| **Polished Gold** | `#d4a840` | Gold hover state (slightly lighter than resting gold) |
| **Pure White** | `#ffffff` | Card surfaces, top bar — always clean, never off-white |
| **Dark Charcoal** | `#1a1208` | Primary text, KPI numbers, headings — warm near-black, not pure black |
| **Warm Stone** | `#7a6e62` | Secondary text, captions, field labels |
| **Sandstone** | `#a89070` | Muted sidebar text, placeholder text |
| **Warm Cream Light** | `#f0e6cc` | Sidebar active text, sidebar primary labels |
| **Terracotta Red** | `#c0392b` | Overdue/alert values, critical action items |
| **Earthy Green** | `#2e7d52` | Paid/success states, positive indicators |
| **Amber** | `#d97706` | Warning states, "Attention" badge |
| **Warm Card Border** | `rgba(201,151,42,0.12)` | Subtle gold-tinted card borders |
| **Warm Card Shadow** | `rgba(26,18,8,0.07)` | Floating card shadow — warm undertone, not grey |

### Color Relationships
- **Sidebar** always dark terracotta — it contrasts with everything around it
- **Cards** always pure white — they float above the sand background
- **Gold** is the only accent color — no blue, no cyan, no purple anywhere
- **Red** appears only for overdue/critical data — never decorative

---

## 3. Typography Rules

**Font family:** Outfit (Google Fonts) — a geometric sans-serif with a clean, slightly warm character that pairs well with Moroccan aesthetics. Fallback: `system-ui, -apple-system, sans-serif`.

| Role | Weight | Size | Notes |
|---|---|---|---|
| KPI numbers / Hero figures | 800 (ExtraBold) | 26–32px | Dark charcoal, creates instant visual hierarchy |
| Section headings | 700 (Bold) | 16–18px | Dark charcoal |
| Card titles / Building names | 600 (SemiBold) | 14–15px | Dark charcoal |
| Body / labels | 500 (Medium) | 13–14px | Warm stone |
| Captions / sub-labels | 400 (Regular) | 11–12px | Sandstone |
| Section headers (all-caps) | 500 (Medium) | 11px | Warm stone, `letter-spacing: 1.5px`, UPPERCASE |
| Sidebar nav items | 500 (Medium) | 13px | Cream or sandstone depending on active state |
| Logo wordmark "SyndicPulse" | 700 (Bold) | 18px | "Syndic" in cream, "Pulse" in burnished gold |

---

## 4. Component Stylings

### Buttons
- **Primary CTA** (e.g., "Se connecter", "Enregistrer"): Pill-shaped (`border-radius: 9999px`), Burnished Gold (`#c9972a`) background, pure white text, warm gold shadow (`0 4px 20px rgba(201,151,42,0.35)`). On hover: slightly lighter gold `#d4a840`.
- **Secondary / outline**: Pill-shaped, transparent bg, gold border `1px solid rgba(201,151,42,0.4)`, gold text. On hover: subtle gold tint background.
- **Ghost / text link**: No border, gold text, underline on hover.
- **Danger**: Same pill shape, terracotta red `#c0392b` background.
- **Disabled state**: `opacity: 0.5`, no shadow.

### Cards / Containers
- **Background:** Pure white (`#ffffff`)
- **Border:** `1px solid rgba(201,151,42,0.12)` — barely visible gold tint
- **Corner radius:** Generously rounded (16px / `rounded-2xl`) — friendly but structured
- **Shadow:** Whisper-soft warm diffused shadow: `0 4px 24px rgba(26,18,8,0.07)` — warm undertone, never grey
- **Padding:** 20–24px internal padding (generous whitespace)
- **No background tints on cards** — always pure white, never sand or cream

### KPI / Metric Cards
- Small icon in a soft gold square: `rgba(201,151,42,0.10)` background, gold icon, 36×36px, `border-radius: 10px`
- Large bold number in Dark Charcoal (`#1a1208`), 28px weight 800
- Primary label below in Warm Stone, 12px
- Sub-label / context in Sandstone, 11px

### Navigation Sidebar
- **Container:** Deep Terracotta (`#2d1b0e`), full height, 240px wide
- **Logo area:** "Syndic" in Warm Cream, "Pulse" in Burnished Gold — building SVG icon in gold
- **Subtitle:** "PLATEFORME DE GESTION" in 10px Sandstone, letter-spacing 2px
- **Nav item — inactive:** Warm Cream text (`#f0e6cc`), no background, sandstone icon
- **Nav item — active:** Burnished Gold text + `3px solid #c9972a` left border + `rgba(201,151,42,0.10)` tinted background
- **Nav item — hover:** `rgba(201,151,42,0.06)` background tint
- **Badge:** Amber (`#d97706`) pill, white text, 10px
- **Zellige overlay:** 10–12% opacity gold diamond-grid SVG pattern over entire sidebar

### Inputs / Forms
- **Background:** Warm Sand (`#f0ebe3`) — subtly off-white, never pure white
- **Border:** `1px solid rgba(201,151,42,0.25)` at rest; `rgba(201,151,42,0.50)` on focus
- **Corner radius:** Subtly rounded (8px)
- **Label:** Warm Stone, 12px, medium weight
- **Placeholder:** Sandstone (`#a89070`)
- **Icon inside input:** Sandstone color

### Progress Bars
- **Track:** `rgba(201,151,42,0.15)` — warm sand tint
- **Fill:** Burnished Gold (`#c9972a`), fully rounded ends (`border-radius: 9999px`)
- Height: 6px

### Badges / Pills
- **"Attention":** Amber background `rgba(217,119,6,0.15)`, amber text `#d97706`, pill shape
- **"Payé" / success:** Green background `rgba(46,125,82,0.12)`, green text `#2e7d52`
- **"Retard" / overdue:** Red background `rgba(192,57,43,0.12)`, red text `#c0392b`
- **"Démo":** Gold outline, sandstone text

### Top Bar
- **Background:** Pure White (`#ffffff`)
- **Bottom border/shadow:** `0 1px 12px rgba(26,18,8,0.06)` — barely visible warm shadow
- **Height:** 56–64px
- **Breadcrumb:** Warm Stone text, `>` separator in Sandstone
- **Icon buttons:** Warm Stone icons, `rgba(201,151,42,0.08)` background on hover, `border-radius: 8px`
- **Date chip:** Warm Sand background, Warm Stone text, `1px solid rgba(201,151,42,0.20)` border, pill shape
- **User avatar:** Burnished Gold background, white initials

### Property Cards (Vue globale)
- White card, rounded-2xl, warm shadow
- Header: colored building dot + bold building name + city in Warm Stone
- Collection progress: "Recouvrement" label + bold % + gold progress bar
- Stats: paid count in Earthy Green · overdue count in Terracotta Red (same row)
- 2×2 mini stat grid with `1px solid rgba(201,151,42,0.10)` dividers
- Footer: "Prochaine AG" + gold date + gold link

---

## 5. Layout Principles

**Application shell:**
- Left sidebar: fixed 240px, full viewport height, Deep Terracotta
- Top bar: fixed 56–64px height, spans content area only (not over sidebar), Pure White
- Content area: fills remaining space, Warm Sand background, scrollable

**Whitespace philosophy:** Generous — cards breathe. Internal card padding 20–24px. Gap between cards 16–20px. Section title to first card: 16px. Never pack elements tight.

**Grid:** 12-column grid within the content area. KPI cards: fluid horizontal scroll row (7 cards × ~200px min). Property cards: 3-column equal grid. Bottom panels: 2-column split (60/40 or 50/50).

**Page structure (standard page):**
1. Breadcrumb + page title block (padding-top 24px from top bar)
2. KPI row (16px margin-top)
3. Section label in uppercase small caps (24px margin-top)
4. Card grid (12px margin-top)
5. Secondary panels row (20px margin-top)

**Zellige background decoration:**
- Applied ONLY to: page background, sidebar background
- Never on cards, modals, dropdowns, or form elements
- SVG pattern: interlocking diamonds, 48×48px tile, `stroke="#c9972a"` at 5–12% opacity
- This detail should be subtle — if it competes with content, reduce opacity

**Modals / overlays:**
- Backdrop: `rgba(26,18,8,0.55)` warm dark overlay (not pure black)
- Modal card: white, `border-radius: 20px`, wide padding 28–32px, `box-shadow: 0 20px 80px rgba(26,18,8,0.20)`

---

## 6. How to Use This File in Stitch Prompts

**Always open your Stitch prompt with:**
```
Apply the SyndicPulse Moroccan Premium design system exactly:
- Page background: Warm Sand (#f5f0e8) with subtle zellige diamond pattern at 5% opacity
- Sidebar: Deep Terracotta (#2d1b0e) with zellige at 10% opacity, cream nav text, gold active state
- Cards: Pure White (#ffffff), rounded-2xl, warm shadow rgba(26,18,8,0.07), gold border tint
- Accent: Burnished Gold (#c9972a) only — no blue, no cyan, no purple
- Text: Dark Charcoal (#1a1208) headings, Warm Stone (#7a6e62) labels, Sandstone (#a89070) muted
- Typography: Outfit font, 800 for numbers, 600 for titles, 500 for labels
- All labels in French
```

**Then describe the specific screen/change below that block.**

---

## 7. Screens Generated / Built

> **Two design directions in use:**
> - **App interior** (all pages inside the dashboard): Navy/Cyan dark — `#0a0f1e` bg, `#06b6d4` accent, glassmorphism cards. This is the default and active theme.
> - **Moroccan Premium** (Gold theme, this DESIGN.md): `#f5f0e8` warm sand bg, `#c9972a` gold accent — selectable via the Palette button in TopBar. Stitch prompts use this direction.

| Screen | Status | Direction | Notes |
|---|---|---|---|
| Login page | ✅ Implemented in code | Moroccan Premium | Terracotta left + cream right split |
| Landing page marketing | ✅ Implemented in code (`public/landing.html`) | Navy/Cyan | Standalone HTML, Tailwind CDN, live at `/landing.html` |
| Vue globale (dashboard) | 🔄 Stitch prompt ready | Moroccan Premium | Use enhanced prompt from session 2026-03-06 |
| Tableau de bord | ⏳ Pending | — | |
| Finances | ⏳ Pending | — | |
| Résidents | ⏳ Pending | — | |
| Litiges | ⏳ Pending | — | |
| Planning | ⏳ Pending | — | |
| Assemblées | ⏳ Pending | — | |
