# Incolo Systems 2.0: Wireframe & Copy Blueprint

**Status:** Draft v2 for approval. No frontend or backend code has been written yet.
**Decisions so far:** Page 3 = Solution pillar page · headings in Inter 400 · social proof = industry tiles + own quote (no client names) · stack = static HTML/CSS/JS + Express (see §4) · KRN Circuit Router added as program P-07 and as a featured deployment
**Reference layout:** keychain.com (homepage, header mega-menu, directory UI, footer)
**Content source:** incolo.si (`incolo-site` repo, `index.html` @ `84a7aba`)
**Date:** 2026-10-20

---

## 0. How keychain.com is built (what we are cloning)

Measured at a 1440 × 900 viewport.

### 0.1 Global frame
| Element | Keychain spec |
|---|---|
| Header | Fixed, 65px tall, white, hairline bottom border on scroll. Logo left · two dropdown triggers centred ("AI for Manufacturers ⌄", "AI for Brands & Retailers ⌄") · right: ghost "Sign in" + filled primary "Request access". |
| Mega-menu | Floating white panel under the trigger, radius ~12px, soft shadow. Each row = 32px icon tile + **title** + one-line grey description. Sub-links under a product (Overview / Purchasing / Inventory / Food Safety). |
| Type | Inter only. Headings are **weight 400** (light-looking) with tight tracking (−0.032em). H1 60/60. H2 36/40. Feature H2 48/48. Eyebrows 11px / 500 / uppercase / +0.18em. Body 16/24. Buttons 14/500 (16/500 in hero). |
| Colour | White page, near-black text `#020817`, grey borders `#D1D5DB`, one loud accent (yellow `#FDE047`) on primary CTAs, highlighted text, screenshot frames, and the hero glow. |
| Buttons | 6px radius. Primary = accent fill + 1px `rgba(0,0,0,.06)` border, 8×14 (nav) or 12×24 (hero). Secondary = white + 1px grey border. "Explore ↗" = small outline button with arrow icon. |
| Motion | Nav drops in on load. Hero diagrams animate. Product section is a **sticky-scroll showcase** (left text pins, right screenshot swaps). AI prompt box types itself out. Customer card is a carousel. |
| Footer | White, border-top. Logo, tagline and social icons on the left. Three link columns with 11px uppercase eyebrow headings. A bottom row with ©, Terms, Privacy, Contact, Sitemap. Below that, a grey-50 **SEO link band** ("Popular Products", 5 columns of long-tail links). |

### 0.2 Homepage section order
1. Announcement pill (live activity ticker) → H1 → sub-line → 2 CTAs, on a faint network-line background with an accent glow
2. **3 product cards** in a row: icon chip + name + tagline, an animated mini-diagram, a short heading, 1–2 lines of copy, and an "Explore X ↗" button
3. **Trust strip:** "Trusted by 28,000+…" line, a compliance badge (SOC 2), and a greyscale logo wall that fades out
4. **Sticky product showcase** (~2,700px): three panels, each with product chip, H2, paragraph, "Request access" and "Explore". The right side is a large UI screenshot inside an accent-coloured frame.
5. **Audience CTA band:** eyebrow "For brands & retailers", H2 "Looking for a manufacturer?", one line, CTA
6. **"Just ask."** AI section: big centred H2, sub-line, and a prompt box on a grey panel that types a request and shows a send button
7. **Customers:** eyebrow, H2, and a full-bleed photo card with an overlaid quote. Key phrase is highlighted in the accent colour. Shows name, title and carousel arrows.
8. **Integrations:** eyebrow, H2, paragraph, logo grid
9. **Final CTA:** "See what Keychain can do for your business." · "Request access today." · primary button, on a network background
10. Footer + SEO link band

### 0.3 Directory / listing pattern (used for Page 2)
The search bar spans the top. A **left filter sidebar** holds checkbox groups (Category, Country, Certifications, Packaging Types…), each collapsible with a "show more" option. The **result list** is on the right: one card per item with logo, name, location, tag chips, capability icons, and a primary "Request introduction" button. A result count sits above the list.

> Note: Keychain's inner pages (`/os`, `/manufacturer`) sit behind a Cloudflare bot check. I didn't bypass it. The directory pattern above comes from the full-size product screenshot embedded on their homepage. If you want a pixel-level match of an inner page, send me screenshots, or ask me to use your Chrome via Claude in Chrome.

---

## 1. Design system: "Keychain structure, Incolo blue"

### 1.1 Colour tokens (yellow → Incolo blue, near-black → Incolo navy)
| Role | Keychain | **Incolo 2.0** | Notes |
|---|---|---|---|
| Page background | `#FFFFFF` | `#FFFFFF` | Keychain-clean white canvas |
| Tinted section / SEO band | gray-50 `#F9FAFB` | `--bg` `#F7FAFD` / `--bg-2` `#EEF4FB` | Blue-tinted greys keep the "sense of blue" everywhere |
| Text (headings) | `#020817` | `--text-strong` `#0B2340` | Incolo navy instead of black |
| Text (body) | slate-600 | `--text-muted` `#4F647C` | |
| Text (faint / meta) | slate-400 | `--text-faint` `#8098B0` | |
| Hairline border | `#E5E7EB` | `--border` `#E2ECF6` | |
| Control border | `#D1D5DB` | `--border-strong` `#CFDEEE` | Secondary buttons, inputs, filter checkboxes |
| **Primary CTA fill** | yellow `#FDE047`, black text | **`--accent` `#1D65CC`, white text** | 5.3:1 contrast (passes AA) |
| Primary hover / pressed | – | `#185ABA` / `#14498F` | |
| **Text highlight marker** (quote) | yellow bg | `--accent-soft` `#DCEBFC` bg, `#0B2340` text | |
| **Screenshot frame** | solid yellow | `--accent-soft` `#DCEBFC` with a 1px `#CFDEEE` inner rule | |
| Hero glow | soft yellow radial | radial `#D7E9FF` → transparent (existing `--wash-hero`) | |
| Network-line pattern | light grey | `#CFDEEE` at 60% | |
| Icon chips | grey outline | white chip, `#E2ECF6` border, `#1D65CC` glyph | |
| Bright accent (dots, active state) | – | `--accent-bright` `#3B82F6` | Live-pulse dot, active filter count |
| Outcome ticks | – | `--data` `#0E9384` | Sparing, only for ✓ outcomes (as today) |
| Dark panel / photo overlay | black gradient | `--surface-ink` `#0D2C52` → transparent | |

### 1.2 Typography
| Token | Spec |
|---|---|
| Family | **Inter for everything, headings included** (confirmed; Space Grotesk is retired). Already self-hosted as `inter-latin-var.woff2`. Mono details (P-01 index) stay in IBM Plex Mono. |
| H1 | 60/60, weight 400, −0.032em (mobile 40/44) |
| H2 feature ("Just ask.") | 48/48, weight 400, −0.032em |
| H2 section | 36/40, weight 400, −0.032em (mobile 30/36) |
| H3 card | 20/28, weight 500, −0.01em |
| Eyebrow | 11/16.5, weight 500, uppercase, +0.18em, `#4F647C` |
| Body / lede | 16/24 · lede 18/28 · small 14/20 |
| Buttons | 14/20 weight 500 (nav, cards) · 16/24 weight 500 (hero, final CTA) |

### 1.3 Shape, spacing, layout
- Container max **1280px**, 32px side padding (16px on mobile). Sections have 96–128px vertical rhythm.
- Radius: buttons/inputs **6px** · cards **12px** · screenshot frames **16px** · pills fully rounded.
- Shadows: almost none. Cards use 1px borders. Only the mega-menu and prompt box get `--shadow-md`.
- Breakpoints: 640 / 768 / 1024 / 1280. Every grid collapses to one column under 768px.

### 1.4 Information architecture (sitemap)
```
/                          Homepage (Page 1)
/programs                  AI Programs directory: search + filters (Page 2)
/programs/<slug>           Program detail ×7 (visual-inspection, packaging-bin-count, …, circuit-router)
/solutions/production-systems   Pillar page  ┐
/solutions/advisory             Pillar page  ├ Keychain "Connect / Edge / OS" equivalents
/solutions/process-modernization Pillar page ┘
/why-incolo                Trust by Design + Vision & values (full)
/contact                   Contact page + form (same /api/contact backend)
/privacy  /terms  /sitemap
```
Keychain's "Post a project" and "Find a manufacturer" open a **dialog** on top of the current page (`?showRequestBrandAccessDialog=show`). We mirror that: every "Book a scoping call" button opens a **scoping-call modal** with the existing form. Without JavaScript the button falls back to `/contact`.

---

## PAGE 1: Homepage (`/`)

### 1A. Visual structure & layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [◆ Incolo Systems]      Solutions ⌄   AI Programs ⌄   Why Incolo     Talk to us  [Book a scoping call] │  HEADER (fixed, 64px)
└──────────────────────────────────────────────────────────────────────────────┘
        ┌───────────────── Solutions mega-menu (on click/hover) ─────────────┐
        │ [icon] AI-Enabled Production Systems   Vision, maintenance & monitoring on the line │
        │        Overview · Visual Inspection · Predictive Maintenance · Monitoring          │
        │ [icon] Manufacturing AI Advisory       From feasibility study to full rollout       │
        │ [icon] Agentic Process Modernization   Paper & spreadsheets → AI-assisted ops       │
        └────────────────────────────────────────────────────────────────────┘

══════════════════════════════ HERO (centred, network-line bg + blue glow) ═════
                 ( ● 100% on-premise inference: zero data leaves the plant  ⟶ )   ← rotating pill
                        Private AI for the shop floor
             Production-grade AI for inspection, maintenance, planning and
             monitoring — running inside your plant, owned entirely by you.
                   [ Book a scoping call ]  [ Explore AI programs ]

 ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
 │[▣] Production Systems│ │[▣] AI Advisory       │ │[▣] Process Modern.   │   3 PILLAR CARDS
 │ tagline (grey)       │ │ tagline              │ │ tagline              │   (3 cols → 1 col mobile)
 │ ┌──────────────────┐ │ │ ┌──────────────────┐ │ │ ┌──────────────────┐ │
 │ │ animated diagram │ │ │ │ animated diagram │ │ │ │ animated diagram │ │
 │ │ edge node + line │ │ │ │ 3-step path      │ │ │ │ paper → agent    │ │
 │ └──────────────────┘ │ │ └──────────────────┘ │ │ └──────────────────┘ │
 │ Short heading.       │ │ Short heading.       │ │ Short heading.       │
 │ 2 lines of copy      │ │ 2 lines of copy      │ │ 2 lines of copy      │
 │ [Explore ↗]          │ │ [Explore ↗]          │ │ [Explore ↗]          │
 └──────────────────────┘ └──────────────────────┘ └──────────────────────┘

──────────────────────────── TRUST STRIP (centred) ────────────────────────────
     Built for plants where data can't leave the building. From single-line pilots to multi-plant rollouts.
                      ( ⛨ Zero third-party trackers · Private by design )
   ┌────────┬────────┬────────┬────────┬────────┬────────┐
   │ Pharma │ Auto-  │Discrete│ Batch  │Thermal │Utilities│   industry tiles (mono icon + label,
   │        │ motive │        │        │ / HX   │         │   greyscale like Keychain's logo wall)
   └────────┴────────┴────────┴────────┴────────┴────────┘
   ┌───────────────┬───────────────┬───────────────┐
   │ 100%          │ 4–8 wks       │ 7             │   stat row (from current hero-meta)
   │ on-premise …  │ scoping→pilot │ AI programs … │
   └───────────────┴───────────────┴───────────────┘

═════════════════ STICKY SHOWCASE (3 panels, left pins, right swaps) ══════════
 ┌──────────────────────────┐   ┌────────────────────────────────────────────┐
 │ [▣ Production Systems]   │   │▓▓▓▓▓▓ blue frame (#DCEBFC) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
 │                          │   │▓  ┌──────────────────────────────────┐  ▓│
 │ AI that runs on          │   │▓  │  dashboard image                 │  ▓│
 │ your line, not in        │   │▓  │  (p01 / p03 / p05 visuals)      │  ▓│
 │ someone else's cloud.    │   │▓  └──────────────────────────────────┘  ▓│
 │ paragraph                │   │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
 │ [Book a scoping call] [Explore ↗] │   └────────────────────────────────────────────┘
 └──────────────────────────┘     … scroll → panel 2 (Advisory) → panel 3 (Modernization)
   (mobile: un-pinned, text stacked above image for each panel)

──────────────────────── AUDIENCE CTA BAND (left text, right CTA) ─────────────
   EYEBROW: FOR PLANT, QUALITY & MAINTENANCE LEADERS
   Looking for a specific AI use case?
   Browse seven manufacturing AI programs by industry, outcome or data source.
                                                         [ Browse AI programs ]

══════════════════════════ "JUST ASK." (centred) ══════════════════════════════
                               Just ask.
         Incolo's on-premise copilot doesn't just answer questions
                     about your plant — it acts.
   ┌──────────────────── tinted panel #F7FAFD ───────────────────────────────┐
   │        ┌────────────────────────────────────────────────┐              │
   │        │ Why did OEE drop on Line 3 last shift?▍         │  (types,     │
   │        │                                         [⎙] [➤]│   rotates 4  │
   │        └────────────────────────────────────────────────┘   prompts)   │
   │        ( 🔒 Runs on your plant server · no data leaves the network )   │
   └─────────────────────────────────────────────────────────────────────────┘

──────────────────── WHY INCOLO (Keychain "Customers" slot) ───────────────────
                        EYEBROW: WHY INCOLO · TRUST BY DESIGN
              Three things competitors cannot easily replicate.
 ┌───────────────────────────────────────────────────────────────────────────┐
 │  full-bleed shop-floor photo (p05) with navy gradient overlay              │
 │                                                                            │
 │  01 / 03                                                                   │
 │  "Plant-floor privacy you can verify. On-premise and edge inference        │
 │   means [production, quality and process data never leave the plant.]"    │  ← blue highlight
 │                                                                            │
 │  Plant-floor privacy                                          [‹] [›]      │
 └───────────────────────────────────────────────────────────────────────────┘
          “Security, privacy, and model accountability are built into …”
                         — Incolo Systems, Core Principles

──────────────────── INTEGRATIONS (centred + tile grid) ───────────────────────
                          EYEBROW: INTEGRATIONS
                   Works with what's already on your floor.
   ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
   │ PLC │SCADA│ MES │ ERP │CMMS │Histo│ IP  │Edge │  generic system tiles (icon + label)
   │     │     │     │     │/EAM │rian │ cams│ GPU │
   └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘

──────────────────── VISION & VALUES (kept: all current content) ─────────────
   EYEBROW: VISION & VALUES
   Private by design, reliable by default, owned entirely by you.
   ┌──────────────── Our vision ───────┐ ┌──────────────── Our mission ──────┐
   └───────────────────────────────────┘ └───────────────────────────────────┘
   ┌──01────────┬──02────────┬──03────────┐    6 values: hairline-bordered
   ├──04────────┼──05────────┼──06────────┤    3×2 grid, no shadows
   └────────────┴────────────┴────────────┘

═══════════════════ FINAL CTA (centred, network bg + blue glow) ══════════════
              See what private AI can do for your plant.
                    Book a scoping call today.
                       [ Book a scoping call ]

──────────────────────────────── FOOTER ───────────────────────────────────────
 [◆ Incolo Systems]        SOLUTIONS            AI PROGRAMS          COMPANY
 Private AI for the        Production Systems   Browse all programs  Why Incolo
 shop floor.               AI Advisory          Scope your use case  Vision & values
 [in]                      Process Modern.      Request a pilot      Contact
 ─────────────────────────────────────────────────────────────────────────────
 © 2026 Incolo Systems. All rights reserved.  Privacy  Terms  Contact  Sitemap
                                       ⛨ Zero third-party trackers · Private by design
 ░░░░░░░░░░░░░░░░░░░░░ SEO BAND (bg #EEF4FB) ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
 Explore by industry & use case
 AI visual inspection for pharma   Predictive maintenance for utilities   …  (4–5 cols)
```

### 1B. Colour & UI mapping (Homepage)
| Component | Treatment |
|---|---|
| Header | White `#FFF`. On scroll it gets a 1px `#E2ECF6` bottom border plus an 80% white backdrop blur. Nav text `#0B2340` 14/500. Chevrons `#8098B0`. "Talk to us" is a ghost button (transparent; hover `#EDF4FE`). **"Book a scoping call" is the primary button: `#1D65CC` fill, white text.** |
| Mega-menu | White panel, 1px `#E2ECF6`, `--shadow-md`, radius 12. Icon tile: white, `#E2ECF6` border, `#1D65CC` glyph. Row hover: `#F2F7FD`. |
| Announcement pill | White, 1px `#CFDEEE`, text `#4F647C` 13px. Pulsing `#3B82F6` dot. Arrow `#1D65CC`. |
| Hero background | White with the network-line SVG in `#CFDEEE` and a radial `#D7E9FF` glow behind the H1 (Keychain's yellow glow, recoloured). |
| H1 / H2 | `#0B2340`, weight 400. Hero sub-line `#4F647C`. |
| Hero CTAs | Primary blue as above, 16px, 12×24. Secondary: white, 1px `#CFDEEE`, text `#0B2340`, hover border `#1D65CC`. |
| Pillar cards | White, 1px `#E2ECF6`, radius 12. Diagram area `#F7FAFD`. Diagram nodes `#1D65CC` and lines `#CFDEEE`, with a pulse travelling along the line in `#3B82F6`. "Explore ↗" is a small outline button. |
| Trust strip | Industry tiles have greyscale icons in `#8098B0` that turn `#1D65CC` on hover. The privacy badge is a pill with a `#1D65CC` shield. Stat numbers are `#0B2340` 36/400 with `#4F647C` captions. |
| Sticky showcase | Product chip: white pill with blue icon. **Screenshot frame `#DCEBFC`** (replaces Keychain's yellow frame), 16 radius. A progress rail on the left edge in `#E2ECF6` fills `#1D65CC` as panels advance. |
| Audience band | `#F7FAFD` background, 12 radius. CTA primary blue. |
| "Just ask." | Panel `#F7FAFD`. Prompt box white with 1px `#CFDEEE`, `--shadow-md`, radius 12. Typed text `#0B2340`. Send button is a **`#1D65CC` circle** (Keychain uses black). The privacy note pill is `#EDF4FE` with `#1D65CC` text. |
| Why-Incolo card | Photo with a `#0D2C52`→transparent left-to-right overlay. Quote text white, 30/36 weight 400. **Highlighted phrase: `#DCEBFC` background, `#0B2340` text** (Keychain's yellow marker, recoloured). Carousel arrows: white 32px squares. |
| Integrations | Tiles: white, 1px `#E2ECF6`, `#4F647C` mono icons. |
| Vision & values | Vision/mission cards `#F7FAFD`. Value grid: hairline `#E2ECF6` dividers, numbers in Plex Mono `#1D65CC`. |
| Final CTA | Same network background and blue glow as the hero. |
| Footer | White, border-top `#E2ECF6`. Column eyebrows 11px uppercase `#8098B0`. Links `#4F647C`, hover `#1D65CC`. SEO band `#EEF4FB`. |
| Focus states | 2px `#1D65CC` ring with 2px offset on every interactive element. |

### 1C. Exact content & copy blueprint (Homepage)

**`<title>`** Incolo Systems | Private, on-edge AI for industrial manufacturing
**Meta description** *(unchanged)* Incolo Systems brings production-grade AI directly to your shop floor: computer-vision inspection, predictive maintenance, production planning and real-time monitoring. It runs on-premise, so your process data never leaves the plant.

#### Header
- Logo: **Incolo Systems** (existing mark)
- Nav: **Solutions ⌄** · **AI Programs ⌄** · **Why Incolo**
- Right: **Talk to us** (ghost → `/contact`) · **Book a scoping call** (primary → opens modal)

**Solutions ⌄ menu** (mirrors "AI for Manufacturers")
| Title | Description | Sub-links |
|---|---|---|
| AI-Enabled Production Systems | Vision, maintenance and monitoring, engineered for the line. | Overview · Visual Inspection · Predictive Maintenance · Shop-Floor Monitoring |
| Manufacturing AI Advisory | From feasibility study to full rollout. | |
| Agentic Process Modernization | Paper and spreadsheets → AI-assisted operations. | |

**AI Programs ⌄ menu** (mirrors "AI for Brands & Retailers")
| Title | Description |
|---|---|
| Browse AI Programs | Explore seven manufacturing AI programs by industry and outcome. |
| Scope Your Use Case | Describe the line, asset or workflow and we'll map it to a program. |
| Request a Pilot | Get a working pilot on one line in 4–8 weeks. |

#### Hero
- **Rotating pill** (factual statements from the current site, cycling every 5s):
  1. "100% on-premise inference: zero data leaves the plant →"
  2. "From scoping to a working pilot on one line in 4–8 weeks →"
  3. "New: Heat-Exchanger Circuit Router, now in use at a heat-exchanger OEM →" *(→ `/programs/circuit-router`; wording to confirm, see §5)*
  4. "New: Brazing Furnace Optimization program →"
- **H1:** Private AI for the shop floor
- **Sub-line:** Production-grade AI for inspection, maintenance, planning and monitoring, running inside your plant and owned entirely by you.
- **CTAs:** [Book a scoping call] [Explore AI programs]

#### Three pillar cards
| Chip title / tagline | Card heading | Copy | Button |
|---|---|---|---|
| **AI-Enabled Production Systems** / Vision, maintenance & monitoring | Run AI on your line. | Inspection, predictive maintenance and monitoring, integrated with your PLCs, SCADA and MES/ERP. | Explore Production Systems ↗ |
| **Manufacturing AI Advisory** / Feasibility to full rollout | Plan AI you can trust. | Hands-on consulting for plant and IT/OT leadership, covering production, quality and maintenance. | Explore Advisory ↗ |
| **Agentic Process Modernization** / Human-in-the-loop by design | Retire the spreadsheet. | Turn manual, paper-based processes into AI-assisted operations with audit trails built in. | Explore Modernization ↗ |

#### Trust strip
- **Line:** Built for plants where data can't leave the building. *(grey:)* From single-line pilots to multi-plant rollouts.
- **Badge:** Zero third-party trackers · Private by design
- **Industry tiles:** Pharma · Automotive · Discrete · Batch & Process · Thermal / Heat-Exchangers · Utilities & Critical Assets
- **Stats:** **100%** Inference on-premise: zero data leaves the plant · **4–8 wks** From scoping to a working pilot on one line · **7** High-impact manufacturing AI programs, with more in the pipeline

#### Sticky showcase (3 panels)
**Panel 1 · AI-Enabled Production Systems** *(visual: p01 visual inspection)*
- **H2:** AI that runs on your line, not in someone else's cloud.
- **Body:** Computer-vision inspection, predictive maintenance and real-time monitoring, engineered for the shop floor. Deployed on edge gateways, line-side compute or private plant servers, and integrated with your existing PLCs, SCADA and MES/ERP systems.
- **CTAs:** [Book a scoping call] [Explore ↗]

**Panel 2 · Manufacturing AI Advisory** *(visual: p04 production planning)*
- **H2:** From feasibility study to full rollout.
- **Body:** A hands-on consulting practice that helps plant and IT/OT leadership design and deploy secure AI across production, quality and maintenance. Every engagement follows the same path, Assess & Design → Pilot & Validate → Scale & Govern, with quality gates and a measurable business case at each stage.
- **CTAs:** [Book a scoping call] [Explore ↗]

**Panel 3 · Agentic Process Modernization** *(visual: a real CKT routing layout rendered by the Circuit Router, e.g. `sample-20x8-both.svg`, inside the blue frame)*
- **H2:** Turn paper and spreadsheets into AI-assisted operations.
- **Body:** Convert manual, paper-based or spreadsheet-driven shop-floor processes into AI-assisted operations, with human-in-the-loop governance, audit trails and measurable throughput gains.
- **Featured deployment chip** (small white card pinned to the bottom-left of the frame): **Heat-Exchanger Circuit Router.** Coil circuit routing that used to be drawn by hand is now generated by rules, checked, and exported as SVG/PDF. [See the program →]
- **CTAs:** [Book a scoping call] [Explore ↗]

#### Audience CTA band
- **Eyebrow:** FOR PLANT, QUALITY & MAINTENANCE LEADERS
- **H2:** Looking for a specific AI use case?
- **Body:** Browse seven manufacturing AI programs by industry, outcome or data source, then request a pilot on your line.
- **CTA:** [Browse AI programs]

#### "Just ask."
- **H2:** Just ask.
- **Sub-line:** Incolo's on-premise copilot doesn't just answer questions about your plant. It acts.
- **Typed prompts (rotate):**
  1. "Why did OEE drop on Line 3 last shift?"
  2. "Draft a revised build plan for the changed order."
  3. "Show escaped defects by station this week."
  4. "Which assets are trending toward failure?"
- **Pill under the box:** 🔒 Runs on your plant server · no data leaves the network

#### Why Incolo (carousel, 3 slides)
- **Eyebrow:** WHY INCOLO · TRUST BY DESIGN
- **H2:** Three things competitors cannot easily replicate.
- **Slide 1 · Plant-floor privacy you can verify:** "On-premise and edge inference means ==production, quality and process data never leave the plant.== No server-side logging of proprietary parameters, no training on your production data, no third-party broker in the pipeline."
- **Slide 2 · Founders who have delivered at scale:** "Most industrial-AI vendors are staffed by researchers who have never run production systems under enterprise SLAs. ==Our founders have spent decades doing exactly that==, and mean it when they say a system is production-ready."
- **Slide 3 · Speed from pilot to production:** "We don't leave leadership with a roadmap and a retainer. ==Our three-phase model gets a working pilot running on your line within weeks==, with quality gates and a measurable business case at every step."
- **Pull quote below:** "Security, privacy, and model accountability are built into architecture decisions from day one. We call this Trust by Design." *(Incolo Systems, Core Principles)*

*(`==…==` = blue highlight marker)*

#### Integrations
- **Eyebrow:** INTEGRATIONS
- **H2:** Works with what's already on your floor.
- **Body:** Incolo connects to your PLCs, SCADA, MES/ERP and maintenance systems, so AI becomes part of how the plant already runs, not another silo.
- **Tiles:** PLCs · SCADA · MES · ERP · CMMS / EAM · Historians · IP & line cameras · Edge gateways

#### Vision & values *(all current content, unchanged)*
- **Eyebrow:** VISION & VALUES
- **H2:** Private by design, reliable by default, owned entirely by you.
- **Our vision:** A world where AI amplifies human potential on the factory floor without compromising data sovereignty. Every plant, from a pharmaceutical clean room to an automotive brazing line, can deploy intelligent systems it owns entirely.
- **Our mission:** To deliver on-premise, edge-deployed intelligence that is fast, private and agentic, helping manufacturers automate inspection, predict failures, plan production and monitor the shop floor in real time.
- **Values:**
  01 **Privacy by Architecture:** We engineer privacy into the foundation, not as a feature. On-premise inference is the standard for production data, not a compromise.
  02 **Validated Before Scaled:** In regulated plants, trust is earned through qualification protocols, audit trails and traceability before a pilot touches live production.
  03 **Execution Over Slides:** We prioritize working pilots on the actual line, with measurable OEE, quality and downtime impact, over strategy decks.
  04 **Engineering Partnership:** We embed with plant IT/OT and quality teams, transfer capability and build long-term delivery discipline, not dependency.
  05 **Built for the Shop Floor:** AI that only runs in a data center excludes the plant floor. We engineer for edge hardware because that is where production happens.
  06 **Responsible Innovation:** Model accountability, cybersecurity and change-control governance are built into every deployment from day one, audit-ready by design.

#### Final CTA
- **H2:** See what private AI can do for your plant.
- **Sub-line:** Book a scoping call today.
- **CTA:** [Book a scoping call]

#### Scoping-call modal (replaces the inline contact section; also lives at `/contact`)
- **Title:** Let's talk about your production priorities
- **Intro:** Engagements typically begin with a scoping call and a short plant walk-through. There's no obligation, just a focused conversation about your priorities and whether we're the right fit.
- **Fields:** Name* · Company* · Work email* · Phone · What are you looking to solve?* *(help text: "Tell us about the line, asset, or workflow, and your priority.")* · Program of interest *(new, optional select: pre-filled when opened from a program card)* · hidden honeypot
- **Button:** [Send enquiry]
- **Fine print:** Your details go straight to our founder. We don't share them, and we don't use a third-party tracker.
- **Side panel:** ✉ business@incolosystems.com *(General & new engagements)* · ☎ +91 99203 23832 *(Mon–Sat, 10:00–18:00 IST)* · ⌖ Faridabad, Haryana, India *(Serving plants across North India & beyond)*

#### Footer
- **Brand block:** Incolo Systems. *Private AI for the shop floor.* [LinkedIn icon, if a URL is provided]
- **SOLUTIONS:** AI-Enabled Production Systems · Manufacturing AI Advisory · Agentic Process Modernization
- **AI PROGRAMS:** Browse all programs · Scope your use case · Request a pilot
- **COMPANY:** Why Incolo · Vision & values · Contact · business@incolosystems.com · +91 99203 23832
- **Bottom row:** © 2026 Incolo Systems. All rights reserved. · Privacy Policy · Terms of Use · Contact Us · Sitemap · *⛨ Zero third-party trackers · Private by design*
- **SEO band, "Explore by industry & use case"** (each link → `/programs?…` filtered view):
  AI visual inspection for pharma · AI visual inspection for automotive · Packaging count verification · Pre-dispatch QC automation · Predictive maintenance for rotating equipment · Predictive maintenance for utilities · AI production planning for batch manufacturing · Real-time OEE monitoring · Shop-floor anomaly detection · Brazing furnace optimization · Heat-exchanger circuit routing automation · Heat-exchanger manufacturing AI · On-premise AI for manufacturing · Edge AI for quality inspection · Agentic AI for planners

---

## PAGE 2: AI Programs directory (`/programs`)

This mirrors Keychain's **"Search Manufacturers"** directory: search bar, left filter sidebar, result-card list, and a primary action on each card that opens the same dialog. The six current programs, plus the new Circuit Router (P-07), become the searchable catalogue. A program-detail page (`/programs/<slug>`) sits behind each card.

### 2A. Visual structure & layout

```
HEADER (same as homepage; "AI Programs" nav item shows active underline)

═════════════════════════ PAGE HERO (left-aligned, compact) ═══════════════════
 Home / AI Programs                                              (breadcrumb, 13px)
 EYEBROW: MANUFACTURING AI PROGRAMS
 Focused, time-boxed pilots that prove value in weeks.
 Every program follows Assess & Design → Pilot & Validate → Scale & Govern.
 ┌───────────────────────────────────────────────────────────────┐ ┌──────────┐
 │ 🔍  Search programs: "defect detection", "vibration", "OEE"…  │ │ Search   │
 └───────────────────────────────────────────────────────────────┘ └──────────┘
 Popular: [Visual inspection] [Predictive maintenance] [OEE] [Planning]   ← quick chips

 ┌─ 3-STEP PATH STRIP (horizontal, hairline) ─────────────────────────────────┐
 │ ① Assess & Design ──── ② Pilot & Validate ──── ③ Scale & Govern            │
 └────────────────────────────────────────────────────────────────────────────┘

═════════════════════ BODY: 280px sidebar + fluid results ═════════════════════
 ┌──────────────────────┐  ┌──────────────────────────────────────────────────┐
 │ Filters      Clear all│  │ Showing 7 programs        Sort: [Recommended ⌄] │
 │──────────────────────│  │ Active: [Pharma ×] [Quality ×]                   │
 │ INDUSTRY          ⌄  │  │┌──────────────────────────────────────────────────┐│
 │ ☐ Pharma          1  │  ││┌────────────┐ P-01 · Computer vision            ││
 │ ☐ Automotive      2  │  │││  thumbnail │ AI Visual Inspection              ││
 │ ☐ Discrete        3  │  │││  16:9      │ [Pharma] [Automotive] [Discrete]  ││
 │ ☐ Batch & Process 2  │  │││  (p01.jpg) │ Edge-deployed computer vision …   ││
 │ ☐ Thermal / HX    2  │  ││└────────────┘ ✓ Reduced escaped-defect rate …   ││
 │ ☐ Utilities       1  │  ││               ✓ Audit-ready defect trail …       ││
 │──────────────────────│  ││  ⛨ On-premise · ⏱ Pilot in 4–8 wks               ││
 │ BUSINESS OUTCOME  ⌄  │  ││              [View program ↗] [Request a pilot]   ││
 │ ☐ Quality & defects  │  │└──────────────────────────────────────────────────┘│
 │ ☐ Uptime & maint.    │  │┌──────────────── card P-02 ───────────────────────┐│
 │ ☐ Throughput & OEE   │  │└──────────────────────────────────────────────────┘│
 │ ☐ On-time delivery   │  │  … P-03 … P-06                                    │
 │ ☐ Energy & scrap     │  │                                                   │
 │ ☐ Compliance & audit │  │ ┌── Inline CTA card (after 3rd result, blue tint) ┐│
 │──────────────────────│  │ │ Don't see your use case?                        ││
 │ AI CAPABILITY     ⌄  │  │ │ Describe the line, asset or workflow — we'll map ││
 │ ☐ Computer vision    │  │ │ it to a program or scope a new one.             ││
 │ ☐ Predictive ML      │  │ │                       [Scope your use case]     ││
 │ ☐ Agentic / copilot  │  │ └─────────────────────────────────────────────────┘│
 │──────────────────────│  │                                                   │
 │ DATA SOURCE       ⌄  │  │ Empty state (0 results): "No programs match those │
 │ ☐ Cameras / vision   │  │ filters." [Clear filters] [Scope your use case]   │
 │ ☐ Sensors (vib/temp) │  └──────────────────────────────────────────────────┘
 │ ☐ SCADA / MES        │
 │ ☐ ERP / BOM / stock  │
 │ ☐ Process parameters │
 │──────────────────────│
 │ ┌ sidebar promo ────┐│
 │ │ 🔒 Every program  ││
 │ │ runs on-premise.  ││
 │ │ [Book a scoping   ││
 │ │  call]            ││
 │ └───────────────────┘│
 └──────────────────────┘
   (mobile: sidebar collapses into a "Filters (2)" button that opens a bottom sheet)

──────────────────── HOW A PROGRAM RUNS (3 columns, hairline) ─────────────────
   ① Assess & Design        ② Pilot & Validate         ③ Scale & Govern

──────────────────── FAQ (accordion, 2-col on desktop) ────────────────────────

═══════════════════ FINAL CTA (same component as homepage) ═══════════════════
FOOTER + SEO BAND (same as homepage)
```

**Behaviour**
- Filtering is client-side from a `programs.json` file, so it's instant and has no backend. Filter state is written to the URL (`/programs?industry=pharma&outcome=quality`) so the footer SEO links and shared URLs open pre-filtered.
- Counts next to each checkbox update live. Groups collapse. On mobile, a "Filters (n)" button opens a bottom sheet with an "Apply" action.
- Search matches title, sectors, description and outcomes.
- **Request a pilot** opens the scoping-call modal with "Program of interest" pre-filled (Keychain's "Request introduction" dialog pattern).
- **View program ↗** goes to `/programs/<slug>` (the detail template comes in the next blueprint round).

### 2B. Colour & UI mapping (Programs directory)
| Component | Treatment |
|---|---|
| Breadcrumb | `#8098B0`, current page `#0B2340`. |
| Search bar | White, 1px `#CFDEEE`, radius 6, 48px tall. Focus: `#1D65CC` border plus a 3px `#DCEBFC` ring. Search icon `#8098B0`. Attached button is primary blue. |
| Quick chips | White pill, 1px `#E2ECF6`, `#4F647C` text. Hover `#EDF4FE` bg, `#1D65CC` text. |
| Path strip | Step numbers in `#1D65CC` Plex Mono. Connector line `#CFDEEE`. |
| Sidebar | White, 1px `#E2ECF6` right rule (no card). Group eyebrows 11px uppercase `#4F647C`. Checkbox: 16px, 1px `#CFDEEE`, radius 4. **Checked = `#1D65CC` fill + white tick.** Counts `#8098B0`. "Clear all" link `#1D65CC`. |
| Active filter chips | `#EDF4FE` bg, `#1D65CC` text, × in `#1D65CC`. |
| Sidebar promo | `#F7FAFD` card, radius 12, blue lock icon, primary button. |
| Result card | White, 1px `#E2ECF6`, radius 12. Hover: border `#CFDEEE` plus `--shadow-sm`. Thumbnail radius 8. "P-01" in Plex Mono `#1D65CC`. Industry chips `#F2F7FD` / `#4F647C`. Outcome ticks `#0E9384`. Meta row `#8098B0`. |
| Card actions | "View program ↗" is a secondary outline button. **"Request a pilot" is primary blue** (Keychain's yellow "Request introduction"). |
| Inline CTA card | `#EDF4FE` bg, 1px `#DCEBFC`, primary button. |
| Sort select | Secondary button styling with a chevron. |
| FAQ | Hairline dividers `#E2ECF6`. Open/close +/− icon in `#1D65CC`. |

### 2C. Exact content & copy blueprint (Programs directory)

**`<title>`** Manufacturing AI Programs | Incolo Systems
**Meta description:** Seven focused, time-boxed manufacturing AI programs, covering visual inspection, packaging verification, predictive maintenance, production planning, shop-floor monitoring, brazing furnace optimization and heat-exchanger circuit routing. Every one runs on-premise.

#### Hero
- **Breadcrumb:** Home / AI Programs
- **Eyebrow:** MANUFACTURING AI PROGRAMS
- **H1:** Focused, time-boxed pilots that prove value in weeks.
- **Sub-line:** Every program follows the same disciplined path, Assess & Design → Pilot & Validate → Scale & Govern, with clear quality gates and a measurable business case at each stage.
- **Search placeholder:** Search programs, e.g. "defect detection", "vibration", "OEE"
- **Search button:** Search
- **Popular:** Visual inspection · Predictive maintenance · OEE monitoring · Production planning

#### Filters sidebar
- **Header:** Filters · *Clear all*
- **INDUSTRY:** Pharma · Automotive · Discrete · Batch & Process · Thermal / Heat-Exchangers · HVAC & Refrigeration · Utilities & Critical Assets
- **BUSINESS OUTCOME:** Quality & defect reduction · Uptime & maintenance · Throughput & OEE · On-time delivery · Energy & scrap · Engineering & design time · Compliance & audit trail
- **AI CAPABILITY:** Computer vision · Predictive ML · Agentic / copilot · Design automation
- **DATA SOURCE:** Cameras & vision · Sensors (vibration, temperature, current, pressure) · SCADA / MES · ERP, BOM & stock · Process parameters · Coil specs & design rules
- **Promo card:** 🔒 **Every program runs on-premise.** Inference stays on your edge gateways, line-side compute or plant servers. [Book a scoping call]

#### Results bar
- "Showing **7** programs" · Sort: **Recommended** / Time to pilot / A–Z

#### Program cards (content from the current site; tags are the proposed filter mapping)

| # | Title · Capability | Industry chips | Description | Outcomes (✓) | Filter tags |
|---|---|---|---|---|---|
| **P-01** | **AI Visual Inspection** · Computer vision | Pharma · Automotive · Discrete | Edge-deployed computer vision trained on line-specific defect libraries (surface, dimensional, print and assembly-completeness), with sub-second inference and a human-in-the-loop review queue. | Reduced escaped-defect rate and less end-of-line manual sampling · Audit-ready defect trail suitable for GMP and OEM reviews | Outcome: Quality, Compliance · Data: Cameras |
| **P-02** | **Packaging & Bin-Count Verification** · Computer vision | Discrete & Batch · Pre-Dispatch QC | Vision-based AI counts each piece as it is placed and checks the final count against target before a container is sealed, with an auditable photo record and a logged override for exceptions. | Miscounts caught at the packing station in seconds, not at the customer dock · Photo-backed proof of what shipped, with no added paperwork | Outcome: Quality, Compliance · Data: Cameras |
| **P-03** | **Predictive Maintenance** · Predictive ML | Rotating Equipment · Utilities · Critical Assets | Vibration, temperature, current and pressure data streamed to on-premise ML models trained on asset-specific failure signatures, with remaining-useful-life alerts and CMMS/EAM work-order integration. | Fewer unplanned stoppages on critical lines and utilities · Shift from calendar-based to condition-based maintenance | Outcome: Uptime · Data: Sensors |
| **P-04** | **Production Planning** · Agentic / copilot | Multi-Product · Batch & Discrete | Agentic re-planning that proposes revised schedules when an order changes. A plain-language interface lets planners request a build plan or dispatch report, checked against the BOM and live stock before anything is committed. | Improved on-time delivery against customer commitments · Minutes, not hours, to turn a request into an approval-ready order | Outcome: On-time delivery · Data: ERP/BOM |
| **P-05** | **Real-Time Shop-Floor Monitoring** · Agentic / copilot | Multi-Line Visibility · OEE | Real-time OEE, throughput and quality dashboards built on your existing SCADA/MES data and deployed on-premise, with an AI copilot that flags anomalies as they emerge and Andon-style escalation. | Slowdowns caught within the hour, not at shift-end · Single real-time view of OEE across lines and shifts | Outcome: Throughput & OEE · Data: SCADA/MES |
| **P-06** | **Brazing Furnace Optimization** · Predictive ML | Automotive Thermal · Heat-Exchangers | ML models trained on furnace zone temperatures, belt speed and atmosphere against downstream leak-test results, recommending parameter adjustments to hold the optimal thermal profile as load and product mix vary. | Reduced scrap and rework from weak or over-brazed joints · Lower energy per unit through tighter thermal-profile control | Outcome: Quality, Energy & scrap · Data: Process params, Sensors |
| **P-07** · *NEW · In use* | **Heat-Exchanger Circuit Router** · Design automation | Heat-Exchangers · HVAC & Refrigeration Coils | Generates refrigerant circuit (CKT) routing layouts for fin-and-tube heat exchangers from the coil grid, target circuits, parity, flow direction and dummy holes. It applies the design team's bend, drainage and coverage rules, balances circuit sizes across the face, and exports an SVG/PDF reference with every run saved for audit and reuse. | Circuit layouts generated in one step instead of drawn by hand · Design rules enforced on every layout, with deviations explained · Every run stored with inputs and output for traceability | Outcome: Engineering & design time, Compliance · Data: Coil specs & design rules |

- **Card meta row (P-01 to P-06):** ⛨ On-premise · ⏱ Pilot in 4–8 wks
- **Card meta row (P-07):** ⛨ Runs fully offline on your PC or plant server · ✓ Delivered to a heat-exchanger OEM
- **P-07 card visual:** the router's own SVG output (circuit bands with dotted rear bends and solid front bends) on a `#F7FAFD` tile, with circuits drawn in an Incolo blue ramp (`#1D65CC` → `#3B82F6` → `#8FB8F0`)
- **Card CTAs:** [View program ↗] [Request a pilot]

#### Inline CTA card (after the third result)
- **Heading:** Don't see your use case?
- **Body:** Describe the line, asset or workflow, and we'll map it to an existing program or scope a new one. More programs are in the pipeline.
- **CTA:** [Scope your use case]

#### Empty state
- **Heading:** No programs match those filters.
- **Body:** Try removing a filter, or tell us what you're trying to solve.
- **CTAs:** [Clear filters] [Scope your use case]

#### How a program runs
- **Eyebrow:** HOW A PROGRAM RUNS
- **H2:** Three phases. Quality gates at every step.
- **① Assess & Design:** A scoping call and a short plant walk-through to pick one line, one asset or one workflow, define success metrics, and confirm data access.
- **② Pilot & Validate:** A working pilot on your line within 4–8 weeks, validated against the agreed metrics with a measurable business case.
- **③ Scale & Govern:** Roll out across lines and plants with qualification protocols, audit trails and change-control governance.

> ⚠ The phase descriptions expand the three phase names from the current site. Please check the wording matches how you actually run engagements.

#### FAQ
- **Does any of our data leave the plant?** No. Inference runs on-premise on edge gateways, line-side compute or private plant servers. There is no server-side logging of proprietary parameters, no training on your production data, and no third-party broker in the pipeline.
- **How long until we see a working pilot?** Typically 4–8 weeks from scoping to a working pilot on one line.
- **Do we need to replace our existing systems?** No. Programs integrate with your existing PLCs, SCADA, MES/ERP and CMMS/EAM systems.
- **We're in a regulated plant. Can you support validation?** Yes. Qualification protocols, audit trails and traceability are completed before a pilot touches live production.
- **What if our use case isn't listed?** Use "Scope your use case." We'll map it to an existing program or scope a new one.

#### Final CTA + Footer
Same as homepage.

---


## PAGE 3: Solution pillar page (`/solutions/production-systems`)

This mirrors Keychain's product page for **Keychain OS** (`/os`, with sub-pages Overview · Purchasing · Inventory · Food Safety). Their inner pages sit behind a bot check, so this page reuses components already measured on the homepage: product chip, framed screenshot, sticky sub-nav, "Explore ↗" cross-links and the final CTA. The same template serves all three pillars. Only the copy and visuals change.

### 3A. Visual structure & layout

```
HEADER (global; "Solutions" shows an active underline)
┌──────────────────────────────────────────────────────────────────────────────┐
│ [▣ AI-Enabled Production Systems]   Overview · Visual Inspection · Predictive │  SUB-NAV (sticky under header,
│                                     Maintenance · Shop-Floor Monitoring ·     │  48px; active item gets a blue
│                                     Packaging Verification  [Book a scoping call]│  underline via scroll-spy)
└──────────────────────────────────────────────────────────────────────────────┘

══════════════════════ HERO (centred, network bg + blue glow) ════════════════
                   [▣ AI-Enabled Production Systems]       ← product chip
                   Run production AI on your own floor.
          Computer-vision inspection, predictive maintenance and
          monitoring, engineered for the shop floor and integrated
              with the PLCs, SCADA and MES/ERP you already run.
                [ Book a scoping call ]  [ Browse programs ]
 ┌──────────────────────────────────────────────────────────────────────────┐
 │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ blue frame #DCEBFC ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
 │▓  ┌────────────────────────────────────────────────────────────────┐  ▓│
 │▓  │  large visual (p01 inspection dashboard)                        │  ▓│
 │▓  │      ╭──────────────╮                    ╭──────────────────╮  │  ▓│  floating callout tags
 │▓  │      │ Sub-second    │                    │ Human-in-the-loop │  │  ▓│  (fade in on scroll)
 │▓  │      │ inference     │                    │ review queue      │  │  ▓│
 │▓  │      ╰──────────────╯                    ╰──────────────────╯  │  ▓│
 │▓  └────────────────────────────────────────────────────────────────┘  ▓│
 └──────────────────────────────────────────────────────────────────────────┘

──────────────────── STAT ROW (3 cols, hairline dividers) ────────────────────
   100%  on-premise inference │ 4–8 wks  scoping → pilot │ 3  deployment targets

═══════════ CAPABILITIES: TABBED SHOWCASE (anchor #inspection etc.) ══════════
   EYEBROW: CAPABILITIES
   Four systems. One private stack.
   [ Visual Inspection ][ Predictive Maintenance ][ Shop-Floor Monitoring ][ Packaging Verification ]
 ┌───────────────────────────────┐  ┌─────────────────────────────────────────┐
 │ P-01 · Computer vision        │  │▓▓ blue frame ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
 │ AI Visual Inspection          │  │▓  program image (swaps with tab)      ▓│
 │ description (2–3 lines)       │  │▓                                      ▓│
 │ ✓ outcome 1                   │  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
 │ ✓ outcome 2                   │  └─────────────────────────────────────────┘
 │ Pharma · Automotive · Discrete│
 │ [Request a pilot] [View program ↗]│
 └───────────────────────────────┘
   (tabs = segmented control; arrow keys move between them; mobile: horizontal-scroll pills)

──────────────── ARCHITECTURE: "WHERE IT RUNS" (diagram) ─────────────────────
   EYEBROW: ARCHITECTURE
   Everything runs inside the plant boundary.
 ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ YOUR PLANT (dashed blue boundary) ─ ─ ─ ─ ─ ─ ─ ─ ┐
 │ [Cameras] [Sensors]  ──▶  [Edge gateway / line-side compute]  ──▶  [Plant server] │
 │                                   models · copilot · audit log       │       │
 │                                                                      ▼       │
 │               [PLC] [SCADA] [MES] [ERP] [CMMS/EAM]  ◀── alerts, work orders │
 └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
                       ✕  Public cloud: nothing crosses this line
   (animated pulses travel the arrows; boundary drawn as a dashed #1D65CC rule)

──────────────── DEPLOYMENT OPTIONS (3 cards) ────────────────────────────────
 ┌ Edge gateways ──────┐ ┌ Line-side compute ──┐ ┌ Private plant servers ┐
 └─────────────────────┘ └─────────────────────┘ └───────────────────────┘

──────────────── GOVERNANCE (3 cols, icon + text) ────────────────────────────
   Human-in-the-loop review  ·  Audit-ready trail  ·  Change-control governance

──────────────── RELATED PROGRAMS (4 compact cards, horizontal) ──────────────
   P-01 · P-02 · P-03 · P-05                        [See all programs →]

──────────────── OTHER SOLUTIONS (2 cards, Keychain cross-sell pattern) ─────
 ┌ [▣] Manufacturing AI Advisory   [Explore ↗] ┐ ┌ [▣] Agentic Process Modernization [Explore ↗] ┐

═══════════════ FINAL CTA (global component) ══════ FOOTER + SEO BAND ═══════
```

### 3B. Colour & UI mapping (Pillar page)
| Component | Treatment |
|---|---|
| Sub-nav bar | White, 1px `#E2ECF6` bottom rule, sticky at `top: 64px`. Links 14/500 `#4F647C`. **Active link `#0B2340` with a 2px `#1D65CC` underline.** Compact primary button on the right appears once the hero CTA scrolls out of view. |
| Product chip | White pill, 1px `#E2ECF6`, blue icon, `#0B2340` label. |
| Hero frame | `#DCEBFC` frame, 16 radius. Floating callouts: white, 1px `#CFDEEE`, `--shadow-md`, small `#3B82F6` dot. |
| Stat row | Numbers `#0B2340` 36/400. Captions `#4F647C`. Dividers `#E2ECF6`. |
| Capability tabs | Segmented control on a `#F2F7FD` track. **Active tab: white with `#1D65CC` text and `--shadow-sm`.** Inactive: `#4F647C`. Image swap cross-fades over 300ms. |
| Architecture diagram | Nodes are white with a 1px `#CFDEEE` border and blue icons. Arrows `#CFDEEE` with pulses in `#3B82F6`. **Plant boundary: dashed 1.5px `#1D65CC` with a `#F7FAFD` fill.** "Public cloud" node is greyed out (`#8098B0`) with a ✕ in `--danger` `#C02B2B` (the only red on the site). |
| Deployment / governance cards | White, 1px `#E2ECF6`, radius 12. Icon tile `#EDF4FE` with a `#1D65CC` glyph. |
| Related program cards | Same component as the Page 2 result card, compact variant (thumbnail on top). |
| Other-solutions cards | `#F7FAFD` background, outline "Explore ↗" button. |

### 3C. Exact content & copy blueprint (Pillar page)

**`<title>`** AI-Enabled Production Systems | Incolo Systems
**Meta description:** Computer-vision inspection, predictive maintenance and real-time monitoring, engineered for the shop floor and running on-premise on edge gateways, line-side compute or private plant servers.

#### Sub-nav
[▣ AI-Enabled Production Systems] · **Overview** · Visual Inspection · Predictive Maintenance · Shop-Floor Monitoring · Packaging Verification · [Book a scoping call]

#### Hero
- **Chip:** AI-Enabled Production Systems
- **H1:** Run production AI on your own floor.
- **Sub-line:** Computer-vision inspection, predictive maintenance and monitoring, engineered for the shop floor and integrated with the PLCs, SCADA and MES/ERP systems you already run.
- **CTAs:** [Book a scoping call] [Browse programs]
- **Callout tags on the visual:** "Sub-second inference at the line" · "Human-in-the-loop review queue" · "Zero data leaves the plant"

#### Stat row
**100%** Inference on-premise · **4–8 wks** From scoping to a working pilot on one line · **3** Deployment targets: edge, line-side, plant server

#### Capabilities (tabs)
- **Eyebrow:** CAPABILITIES
- **H2:** Four systems. One private stack.
- Tab content = the program card copy from Page 2, verbatim:
  - **Visual Inspection** → P-01 (description, both outcomes, chips)
  - **Predictive Maintenance** → P-03
  - **Shop-Floor Monitoring** → P-05
  - **Packaging Verification** → P-02
- **Buttons per tab:** [Request a pilot] [View program ↗]

#### Architecture
- **Eyebrow:** ARCHITECTURE
- **H2:** Everything runs inside the plant boundary.
- **Body:** Cameras and sensors feed edge gateways or line-side compute. Models, the copilot and the audit log live on your own plant server. Alerts and work orders flow back into your PLC, SCADA, MES, ERP and CMMS/EAM systems. No server-side logging of proprietary parameters, no training on your production data, no third-party broker in the pipeline.
- **Diagram labels:** Cameras · Sensors (vibration, temperature, current, pressure) · Edge gateway / line-side compute · Plant server (models · copilot · audit log) · PLC · SCADA · MES · ERP · CMMS/EAM · *Public cloud: nothing crosses this line*

#### Deployment options
- **Eyebrow:** DEPLOYMENT
- **H2:** Deployed where production happens.
- **Edge gateways:** Inference next to the camera or sensor, for sub-second decisions at the station.
- **Line-side compute:** One compact node per line, running inspection, counting and monitoring together.
- **Private plant servers:** Central models, dashboards and the copilot, inside your own network and under your own IT policies.

#### Governance
- **Eyebrow:** TRUST BY DESIGN
- **H2:** Validated before scaled.
- **Human-in-the-loop review:** Operators confirm or override AI decisions from a review queue. Every override is logged.
- **Audit-ready trail:** Defect, count and maintenance records suitable for GMP and OEM reviews.
- **Change-control governance:** Model accountability, cybersecurity and change control are built into every deployment from day one.

#### Related programs
- **H2:** Programs in this solution
- Cards: P-01 AI Visual Inspection · P-02 Packaging & Bin-Count Verification · P-03 Predictive Maintenance · P-05 Real-Time Shop-Floor Monitoring
- **Link:** See all programs → (`/programs?solution=production-systems`)

#### Other solutions
- **Manufacturing AI Advisory:** From feasibility study to full rollout. [Explore Advisory ↗]
- **Agentic Process Modernization:** Paper and spreadsheets → AI-assisted operations. Includes the Heat-Exchanger Circuit Router. [Explore Modernization ↗]

#### Final CTA + Footer
Same as homepage.

> The deployment-option and governance lines rephrase existing site content ("edge gateways, line-side compute, or private plant servers", "human-in-the-loop", "audit-ready", "change-control governance"). Callout "Sub-second inference" comes from P-01. Nothing here adds new performance claims.

---

## 4. Technical approach (decided)

**Decision: static HTML/CSS/vanilla JS + Express.** You asked for this unless it would compromise the output. It won't. Every Keychain feature in this blueprint maps to a native web feature:

| Keychain feature | How we build it (no framework) |
|---|---|
| Mega-menu dropdowns | `<button aria-expanded>` + CSS panel + ~40 lines of JS (hover, click, Esc, focus trap) |
| Animated hero / pillar diagrams | Inline SVG + CSS keyframes (respects `prefers-reduced-motion`) |
| Sticky-scroll product showcase | `position: sticky` + `IntersectionObserver` |
| Typing "Just ask." prompt | Small JS typewriter loop |
| Quote carousel | CSS scroll-snap + prev/next buttons |
| Directory search + filters + URL state | JS over `programs.json` + `URLSearchParams` |
| "Request…" dialog | Native `<dialog>` element, posting to `/api/contact` |
| Tabs, sub-nav scroll-spy, accordion | ARIA tabs + `IntersectionObserver` + `<details>` |

Next.js would only pay off for thousands of server-rendered directory pages (Keychain has 30,000 supplier profiles). Incolo has 7 programs, so static is just as capable, and it's faster and simpler to deploy on your OCI server.

| Area | Plan |
|---|---|
| Pages | Hand-written HTML partials (header, footer, modal) assembled by a ~50-line Node script into `dist/` |
| Backend | `server.js` (Express) ported from `incolo-site`: static serving, `POST /api/contact` (honeypot, validation, `leads.jsonl`, Nodemailer SMTP), plus a new optional `program` field |
| Data | `data/programs.json` (7 programs) drives the directory, detail pages, pillar tabs, SEO links and the modal's program select |
| Assets | Self-hosted Inter + IBM Plex Mono. Program images copied from `incolo-site`. Circuit Router visual exported from the router's own SVG output. |
| Local run | `npm install && npm run dev` → http://localhost:3000 |
| Deploy | Unchanged from today: nginx → Node :3000, systemd, Certbot (`DEPLOY-OCI.md` carried over) |
| Repo | `github.com/gauravdua12/incolo-website2`, cloned at `…/Projects/incolosite2.0` |

---

## 5. Remaining open questions

1. **Naming KRN.** The blueprint says "a heat-exchanger OEM" and doesn't name KRN. Do you have KRN's permission to name them (and use their logo) on the site?
2. **Circuit Router on the site: showcase only, or a demo?** Options:
   - (a) Showcase only: program card, detail page, featured chip (as drafted).
   - (b) Static interactive demo on `/programs/circuit-router`: pick from a few pre-generated grid sizes and toggle incline/decline. No backend needed.
   - (c) Live demo calling the router engine. This needs a Python service next to Express and exposes the engine publicly. Not recommended.
3. **"In use" status.** Is it accurate to say the Circuit Router is delivered and in use at the client? It drives the hero pill and the P-07 badge.
4. **Header right side.** Keychain has "Sign in". Incolo has no client login, so this blueprint uses "Talk to us". Is there a client portal it should link to instead?
5. **Socials.** Should the footer show a LinkedIn (or other) URL?
6. **Canonical domain.** Is it `incolo.si` or `incolosystems.com`? This affects canonical tags, the sitemap and OG URLs.
7. **Phase wording.** Do the expanded Assess / Pilot / Scale descriptions on Page 2 match how you run engagements?

---

## 6. Revision 3: data residency, Industry 5.0 tagline, Industry 4.0 standards

*Requested and approved 2026-10-20; merged into `main`.*

### 6.1 Showcase panel 1 headline
- **Kicker:** DATA RESIDENCY
- **H2:** AI that runs within your firewall, with your total control. *(replaces "AI that runs on your line, not in someone else's cloud.")*
- **New option cards:** **On-premise**: edge gateways, line-side compute or private plant servers · **Private cloud**: your own tenancy, inside your security perimeter
- **Note:** Where your AI and data live is always your decision. We engineer for either.

### 6.2 "Data residency is the customer's decision" message, applied site-wide
| Place | New copy |
|---|---|
| Hero pill (first message) | Data residency, your choice: on-premise or private cloud |
| Hero sub-line | …running on-premise or in your private cloud, and owned entirely by you. |
| Trust strip badge (new) | On-premise or private cloud: data residency is your decision |
| Stat "100%" | Data residency under your control: on-premise or private cloud, your call |
| "Just ask." pill | Runs on your plant server or private cloud · your data stays under your control |
| Why Incolo slide 1 | On-premise or private cloud, ==you decide where production, quality and process data live, and it never leaves your control.== … |
| Programs sidebar promo | **Your data, your residency.** Every program runs on-premise (edge gateways, line-side compute, plant servers) or in your private cloud. Where it runs is your decision. |
| Program card meta | On-prem or private cloud · Pilot in 4–8 wks |
| Programs FAQ #1 | **Where does our data live?** Wherever you decide. Data residency is your call: on-premise or your own private cloud. Either way it stays within your firewall… |
| Meta descriptions | …runs on-premise or in your private cloud… |

### 6.3 Industry 5.0 tagline
- **Tagline band** (new section between the trust strip and the showcase; Incolo blue on a faint binary-digit texture, after the supplied artwork):
  - Eyebrow: INDUSTRY 5.0 | AUTOMATIONS & AI SOLUTIONS FOR ALL
  - Short blue rule
  - Headline (Hindi): **आपका बिजनेस, हमारा साथ, आपका निजी AI।**
  - English line: Your business. Our partnership. Your private AI.
- **Also in:** footer brand block (eyebrow + Hindi line) and the hero pill rotation ("Industry 5.0: automations & AI solutions for all").
- **Font:** the mockup uses the system Devanagari font (Kohinoor Devanagari on macOS, Nirmala UI on Windows). The build will self-host **Noto Sans Devanagari** so it looks the same everywhere.

### 6.4 Industry 4.0 standards (new section, after Integrations)
- **Eyebrow:** INDUSTRY 4.0 STANDARDS · **H2:** Built on open Industry 4.0 standards.
- **Body:** Every Incolo deployment is designed around the open standards your plant already speaks, so AI connects cleanly, stays secure and stands up to audit, whether it runs on-premise or in your private cloud.
- **Eight cards:** OPC UA (IEC 62541) · MQTT / Sparkplug B · ISA-95 (IEC 62264) · ISA/IEC 62443 · RAMI 4.0 / Asset Administration Shell · ISO 22400 KPIs · Modbus / PROFINET / EtherNet/IP · GAMP 5 / 21 CFR Part 11
- **Footer line:** Industry 4.0 foundations → Industry 5.0 outcomes · connected, secure and human-centric
- Footer "Company" column gains an **Industry 4.0 standards** link.

> ✓ **Confirmed 2026-10-20:** all eight standards are approved to keep. The copy says "designed around", not "certified to".
