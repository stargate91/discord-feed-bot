# NovaFeeds v2 — Frontend Újraépítési Terv

## 1. Jelenlegi Oldal Audit

### Publikus Oldalak (Marketing)
| Oldal | Fájl | Funkció |
|---|---|---|
| Landing Page | `app/page.js` | Hero, feature showcase, platform carousel, preview section, footer |
| Privacy Policy | `app/privacy/page.js` | Statikus policy szöveg |
| Terms of Service | `app/terms/page.js` | Statikus TOS szöveg |
| Server Választó | `app/select-server/page.js` | Guild lista bot meghívóval |
| Invite Callback | `app/invite-callback/page.js` | OAuth redirect handler |

### Dashboard Oldalak (Auth mögött)
| Oldal | Fájl | Funkció |
|---|---|---|
| Dashboard | `(dashboard)/dashboard/page.js` | Stat kártyák, live ticker, quick actions, log streamer |
| Monitors | `(dashboard)/monitors/page.js` | Monitor CRUD, bulk add/edit, kártya rács |
| Analytics | `(dashboard)/analytics/page.js` | Grafikonok, heatmap, időszak-választó |
| Settings | `(dashboard)/settings/page.js` | Nyelv, intervallum, template editor, branding, prémium kód |
| Premium | `(dashboard)/premium/page.js` | Árazási kártyák (dashboard kontextusban) |
| FAQ | `(dashboard)/faq/page.js` | GYIK szekciók |
| Guide | `(dashboard)/guide/page.js` | Használati útmutató |
| Dev Settings | `(dashboard)/dev/page.js` | Master-only fejlesztői panel |

### API Route-ok (1:1 átjönnek — nem változnak)
```
/api/auth/         — NextAuth (Discord OAuth)
/api/guilds/       — Guild lista, channels, roles
/api/monitors/     — CRUD + bulk + actions
/api/stats/        — Dashboard statisztikák
/api/logs/         — Log streaming
/api/config/       — Tier config
/api/premium/      — Prémium státusz, redeem
/api/checkout/     — Stripe checkout session
/api/billing/      — Billing portal
/api/announcements/— Bejelentések
/api/bot/          — Bot sync
/api/webhooks/     — Stripe webhook
/api/admin/        — Admin műveletek
/api/youtube/      — YT search
/api/twitch/       — Twitch search  
/api/steam/        — Steam app search
/api/github/       — GitHub repo search
/api/proxy/        — Képproxy
```

### Üzleti Logika (1:1 átjön)
```
lib/auth.js          — NextAuth config
lib/db.js            — MongoDB kapcsolat
lib/config.js        — Tier konfig
lib/constants.js     — Platform/tier konstansok
lib/monitorConstants — Monitor típus definíciók
lib/permissions.js   — Jogosultságkezelés
lib/premium-data.js  — Prémium tier adatok
services/*           — API service réteg (5 fájl)
context/ToastContext — Toast értesítések
hooks/useConfig      — Tier config hook
```

---

## 2. Az Új Architektúra Alapelvei

### ❌ Amit KIDOBUNK
- `<style jsx>` blokkok (25+ komponensben)
- Inline `style={{}}` propok
- `globals.css` mint ~1500 soros stílusdump
- Komponens-szintű stílusdefiníciók

### ✅ Amit HASZNÁLUNK
- **Kizárólag CSS Modules** — minden komponensnek saját `.module.css`
- **Egyetlen token fájl** — `tokens.css` mint a dizájn rendszer forrása
- **Újrafelhasználható UI primitívek** — Button, Card, Badge, Modal stb.
- **Kompozíció** — oldalak = UI primitívek összeszerelése

---

## 3. Mappastruktúra

```
web-v2/src/
├── app/
│   ├── globals.css              ← CSAK reset + token import + body alapok (~50 sor)
│   ├── layout.js                ← Root layout (font, providers)
│   ├── page.js                  ← Landing page
│   ├── privacy/page.js
│   ├── terms/page.js
│   ├── select-server/
│   ├── invite-callback/
│   ├── auth/
│   ├── (dashboard)/
│   │   ├── layout.js            ← Sidebar + main content shell
│   │   ├── dashboard/page.js
│   │   ├── monitors/page.js
│   │   ├── analytics/page.js
│   │   ├── settings/page.js
│   │   ├── premium/page.js
│   │   ├── faq/page.js
│   │   ├── guide/page.js
│   │   └── dev/page.js
│   └── api/                     ← 1:1 COPY a jelenlegi /api-ból
│
├── styles/
│   ├── tokens.css               ← 🔑 EGYETLEN FORRÁS: színek, spacing, radii, shadows, fonts
│   ├── reset.css                ← Minimal CSS reset
│   └── utilities.css            ← Opcionális helper osztályok (pl. .sr-only, .truncate)
│
├── components/
│   ├── ui/                      ← 🧱 Primitív UI kockák (0 üzleti logika)
│   │   ├── Button/
│   │   │   ├── Button.js
│   │   │   └── Button.module.css
│   │   ├── Card/
│   │   ├── Badge/
│   │   ├── Modal/
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Toggle/
│   │   ├── Tabs/
│   │   ├── Toast/
│   │   ├── Tooltip/
│   │   ├── Slider/
│   │   ├── Spinner/
│   │   ├── Avatar/
│   │   ├── StatusDot/
│   │   ├── IconBox/
│   │   └── ProgressRing/
│   │
│   ├── layout/                  ← 📐 Elrendezés komponensek
│   │   ├── Sidebar/
│   │   ├── MobileNav/
│   │   ├── PageHeader/
│   │   ├── MarketingNavbar/
│   │   ├── Footer/
│   │   └── FloatingHelp/
│   │
│   ├── dashboard/               ← 📊 Dashboard-specifikus
│   │   ├── StatCard/
│   │   ├── LiveTicker/
│   │   ├── LogStreamer/
│   │   ├── QuickActions/
│   │   ├── UsageIndicator/
│   │   └── AnnouncementBanner/
│   │
│   ├── monitors/                ← 📡 Monitor-specifikus
│   │   ├── MonitorCard/
│   │   ├── CreateMonitorModal/
│   │   ├── EditMonitorModal/
│   │   ├── BulkAddModal/
│   │   ├── BulkEditModal/
│   │   ├── DiagnosticsPanel/
│   │   ├── PlatformGrid/
│   │   ├── PlatformConfig/     ← YouTube, Crypto, Generic stb.
│   │   └── DiscordPreview/
│   │
│   ├── analytics/               ← 📈 Analitika-specifikus
│   │   ├── ChartCard/
│   │   ├── HeatmapChart/
│   │   └── RangeSelector/
│   │
│   ├── settings/                ← ⚙️ Beállítások-specifikus
│   │   ├── SettingCard/
│   │   ├── TemplateEditor/
│   │   ├── ColorPicker/
│   │   ├── BrandingModeSelector/
│   │   └── RedeemCode/
│   │
│   ├── premium/                 ← 💎 Premium-specifikus
│   │   ├── PricingCard/
│   │   ├── ComparisonTable/
│   │   └── PremiumBadge/
│   │
│   ├── marketing/               ← 🌐 Landing page-specifikus
│   │   ├── Hero/
│   │   ├── FeatureGrid/
│   │   ├── PlatformCarousel/
│   │   ├── PreviewSection/
│   │   └── FloatingBackground/
│   │
│   └── auth/                    ← 🔐 Auth-specifikus
│       ├── LoginButton/
│       ├── GuildSwitcher/
│       └── ServerCard/
│
├── lib/                         ← 1:1 COPY
├── services/                    ← 1:1 COPY
├── hooks/                       ← 1:1 COPY + bővítés
└── context/                     ← 1:1 COPY
```

---

## 4. Design Token Rendszer (`tokens.css`)

> **Ez az EGYETLEN fájl, amit módosítani kell a teljes dizájn megváltoztatásához.**

```css
:root {
  /* ══════ PALETTE ══════ */
  --color-purple-50:  #f3e8ff;
  --color-purple-100: #e0c3fc;
  --color-purple-400: #9d4edd;
  --color-purple-500: #7b2cbf;
  --color-purple-700: #5a189a;
  --color-purple-900: #240046;

  --color-gray-50:  #f8f8f8;
  --color-gray-300: #a0a0b0;
  --color-gray-500: rgba(255, 255, 255, 0.4);
  --color-gray-800: #11111a;
  --color-gray-900: #0a0a0f;
  --color-gray-950: #050508;

  --color-green-400: #4ade80;
  --color-green-500: #10b981;
  --color-red-400:   #f87171;
  --color-red-500:   #ef4444;
  --color-amber-400: #ffb703;
  --color-amber-500: #fb8500;
  --color-blue-500:  #3b82f6;

  /* ══════ SEMANTIC ══════ */
  --accent:         var(--color-purple-500);
  --accent-hover:   var(--color-purple-400);
  --accent-glow:    rgba(123, 44, 191, 0.4);

  --bg-app:         var(--color-gray-900);
  --bg-panel:       var(--color-gray-800);
  --bg-card:        rgba(255, 255, 255, 0.03);
  --bg-elevated:    rgba(255, 255, 255, 0.06);
  --bg-overlay:     rgba(0, 0, 0, 0.85);

  --text-primary:   var(--color-gray-50);
  --text-secondary: var(--color-gray-300);
  --text-muted:     var(--color-gray-500);

  --border:         rgba(255, 255, 255, 0.08);
  --border-hover:   rgba(255, 255, 255, 0.15);

  --success:        var(--color-green-500);
  --warning:        var(--color-amber-400);
  --error:          var(--color-red-500);

  /* ══════ SPACING (8px base) ══════ */
  --sp-1:  0.25rem;   /* 4px  */
  --sp-2:  0.5rem;    /* 8px  */
  --sp-3:  0.75rem;   /* 12px */
  --sp-4:  1rem;      /* 16px */
  --sp-5:  1.25rem;   /* 20px */
  --sp-6:  1.5rem;    /* 24px */
  --sp-8:  2rem;      /* 32px */
  --sp-10: 2.5rem;    /* 40px */
  --sp-12: 3rem;      /* 48px */
  --sp-16: 4rem;      /* 64px */

  /* ══════ RADII ══════ */
  --radius-xs:   4px;
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-full: 9999px;

  /* ══════ SHADOWS ══════ */
  --shadow-sm:  0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md:  0 8px 30px rgba(0, 0, 0, 0.4);
  --shadow-lg:  0 20px 60px rgba(0, 0, 0, 0.6);
  --shadow-glow: 0 0 20px var(--accent-glow);

  /* ══════ TYPOGRAPHY ══════ */
  --font-sans:  'Inter', system-ui, sans-serif;
  --font-mono:  'JetBrains Mono', monospace;

  /* ══════ LAYOUT ══════ */
  --sidebar-w:         250px;
  --sidebar-collapsed:  72px;

  /* ══════ TRANSITIONS ══════ */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 150ms;
  --duration-normal: 300ms;
}
```

---

## 5. UI Primitív Komponensek Blueprint

### Minden primitív felépítése:
```
components/ui/Button/
├── Button.js          ← React komponens, props: variant, size, icon, loading stb.
└── Button.module.css  ← KIZÁRÓLAG tokenekre hivatkozik, soha nem hardcode-ol
```

### Primitív lista és variánsaik:

| Primitív | Variánsok | Használat |
|---|---|---|
| **Button** | `primary`, `secondary`, `ghost`, `danger`, `premium` | Minden interaktív gomb |
| **Card** | `default`, `stat`, `interactive`, `highlighted` | Konténer kártyák |
| **Badge** | `success`, `warning`, `error`, `info`, `premium` | Státusz jelzők |
| **Modal** | `default`, `wide`, `fullscreen` (mobile) | Minden felugró ablak |
| **Input** | `text`, `number`, `search`, `textarea` | Szövegmezők |
| **Select** | `single`, `multi`, `searchable` | Legördülők (Channel/Role picker) |
| **Toggle** | `default`, `with-label` | Ki/be kapcsolók |
| **Tabs** | `horizontal`, `pill`, `platform` | Fülek (platform választó stb.) |
| **Toast** | `success`, `error`, `info`, `warning` | Értesítések |
| **Slider** | `default`, `danger` | Range inputok (repost, purge) |
| **Spinner** | `sm`, `md`, `lg` | Betöltés jelzők |
| **Avatar** | `user`, `guild`, `placeholder` | Profilképek |
| **StatusDot** | `online`, `offline`, `warning` | Állapotjelzők |
| **IconBox** | `default`, `accent`, `success`, `warning` | Ikon konténerek |
| **ProgressRing** | SVG gauge | Használati indikátor |

### CSS Module minta (Button példa):
```css
/* Button.module.css — CSAK tokeneket használ */
.base {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-weight: 700;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-in-out);
}

.sm { padding: var(--sp-1) var(--sp-3); font-size: 0.85rem; border-radius: var(--radius-sm); }
.md { padding: var(--sp-2) var(--sp-4); font-size: 0.95rem; border-radius: var(--radius-md); }
.lg { padding: var(--sp-3) var(--sp-6); font-size: 1.1rem;  border-radius: var(--radius-md); }

.primary {
  background: var(--accent);
  color: white;
  box-shadow: 0 4px 12px var(--accent-glow);
}
.primary:hover { background: var(--accent-hover); transform: translateY(-2px); }

.ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border);
}
.ghost:hover { background: var(--bg-elevated); color: white; }

.danger {
  background: transparent;
  color: var(--error);
  border-color: rgba(239, 68, 68, 0.3);
}
.danger:hover { background: rgba(239, 68, 68, 0.1); }
```

---

## 6. Implementáció Fázisai

### 🔴 Fázis 1 — Alap (1-2 nap)
1. Új Next.js projekt inicializálás (`web-v2/`)
2. `tokens.css` + `reset.css` + `globals.css` létrehozása
3. NextAuth + MongoDB config átmásolása (`lib/`, `services/`, `hooks/`, `context/`)
4. **Összes `/api/` route** 1:1 másolása
5. Root layout (font betöltés, providers)

### 🟡 Fázis 2 — UI Primitívek (2-3 nap)
1. `Button` — primary, secondary, ghost, danger, premium, loading state
2. `Card` — default, stat, interactive, highlighted
3. `Badge` — success, warning, error, info, premium
4. `Modal` — overlay, header, body, footer, close, responsive
5. `Input` + `Select` + `MultiSelect` — egységes form elemek
6. `Toggle`, `Slider`, `Tabs`
7. `Toast` rendszer (context + komponens)
8. `Spinner`, `Avatar`, `StatusDot`, `IconBox`
9. `ProgressRing` (SVG gauge)

### 🟢 Fázis 3 — Layout Shell (1 nap)
1. `Sidebar` — collapse/expand, guild switcher, nav links, responsive
2. `MobileNav` — hamburger drawer
3. `PageHeader` — title, subtitle, action slot
4. `MarketingNavbar` — logo, nav, login button
5. `Footer` — link grid, copyright
6. `FloatingHelp` — help menu

### 🔵 Fázis 4 — Dashboard Oldalak (3-4 nap)
1. **Dashboard** — StatCard grid, LiveTicker, QuickActions, LogStreamer, AnnouncementBanner
2. **Monitors** — MonitorCard grid, toolbar (add/bulk/filter), Create/Edit/BulkAdd/BulkEdit modalok
3. **Analytics** — ChartCard grid, HeatmapChart, RangeSelector, UsageIndicator
4. **Settings** — SettingCard sections, TemplateEditor, ColorPicker, BrandingMode, RedeemCode
5. **Premium (dashboard)** — PricingCard grid, ComparisonTable
6. **FAQ** — Accordion szekciók
7. **Guide** — Step-by-step útmutató
8. **Dev** — Master-only panel

### 🟣 Fázis 5 — Marketing Oldalak (1-2 nap)
1. **Landing Page** — Hero, FeatureGrid, PlatformCarousel, PreviewSection
2. **Premium (publikus)** — Landing variáns PricingCard-okkal
3. **Server Választó** — Guild kártya rács
4. **Privacy / Terms** — Policy layout
5. **FloatingBackground** — Parallax blobs

### ⚪ Fázis 6 — Finomhangolás (1 nap)
1. Animációk és micro-interakciók
2. Responsive tesztelés (mobile/tablet/desktop)
3. Loading state-ek, skeleton-ek
4. SEO meta tagek
5. Régi `web/` leváltása `web-v2/`-re

---

## 7. Fő Szabályok az Új Kódbázisban

### A 6 Vas Szabály
1. **SOHA nem írunk hardcoded értéket** — minden szín, spacing, radius, shadow a `tokens.css`-ből jön
2. **SOHA nem használunk `<style jsx>`-et** — kizárólag CSS Modules
3. **SOHA nem használunk inline `style={{}}`-t** — kivéve dinamikus értékek (pl. `style={{ color: embedColor }}`)
4. **Minden UI elem egy primitívből épül** — ha nincs rá primitív, először azt készítjük el
5. **Egy komponens = egy mappa** — `ComponentName/ComponentName.js` + `ComponentName.module.css`
6. **CSS Module-ban CSAK tokenekre hivatkozunk** — `var(--accent)`, soha nem `#7b2cbf`

---

## 8. Összefoglaló

| Szempont | Régi (v1) | Új (v2) |
|---|---|---|
| Stílus módszer | 3 féle keverve | Kizárólag CSS Modules |
| Token forrás | globals.css (~1500 sor vegyes) | tokens.css (~100 sor, tiszta) |
| UI primitívek | Nincs | 15+ újrafelhasználható kocka |
| Szín változtatás | 25+ fájl kézi módosítás | 1 fájl, 1 sor |
| Új komponens hozzáadás | "Hova tegyem a CSS-t?" | Egyértelmű: saját mappa + module |
| API réteg | ✅ | ✅ 1:1 másolat |
| Üzleti logika | ✅ | ✅ 1:1 másolat |

**Becsült idő: ~10-12 munkanap** a teljes átépítésre.
