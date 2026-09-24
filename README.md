# Myanmar Calendar · မြန်မာပြက္ခဒိန်

A bilingual Myanmar–English Progressive Web App (PWA) with an iOS 26 Liquid Glass design. Displays Gregorian and traditional Myanmar lunar dates, public holidays, moon phases, and full astrological day information — all offline-capable.

မြန်မာဘာသာ + အင်္ဂလိပ်ဘာသာ iOS 26 Liquid Glass ဒီဇိုင်း PWA၊ Gregory နှင့် မြန်မာ ပြက္ခဒိန် နှစ်မျိုးစလုံး၊ ပြည်သူ့ရုံးပိတ်ရက်များ၊ လဆုပ်လဆန်း၊ နက္ခတ်ဗေဒင် အချက်အလက်များ offline ဖော်ပြသည့် ဝက်ဘ်အက်ပ်ဖြစ်သည်။

**Version:** 3.4.0 · **Developer:** Okkar Thet Naing · **Company:** GoeTecX

---

## Features · လုပ်ဆောင်ချက်များ

| Feature | Description | မြန်မာဘာသာ |
|---|---|---|
| 📅 Dual Calendar | Gregorian + Myanmar lunar date on every cell | Gregory + မြန်မာသက္ကရာဇ် ၂ မျိုးစလုံး |
| 🎌 Public Holidays | All Myanmar public holidays with bilingual names | ပြည်သူ့ရုံးပိတ်ရက် အပြည့်အစုံ |
| 🌕 Moon Phases | Full Moon / New Moon pill badge anchored to date circle | လပြည့် / လကွယ် ဖော်ပြချက် |
| 🔮 Astrology | Mahabote, Nakhat, Nagahle per day (fully bilingual) | မဟာဘုတ်, နက္ခက်, နဂါးခေါင်း |
| ☸️ Sabbath | Sabbath (ဥပုသ်) marker with ☸️ icon | ဥပုသ်နေ့ ☸️ သင်္ကေတ |
| 🌈 Yatyaza | Yatyaza (ရက်ရာဇာ) caution marker with 🌈 icon | ရက်ရာဇာနေ့ 🌈 သင်္ကေတ |
| ⚠️ Auspicious Days | Yatyaza, Pyathada, Sabbath, Thamaphyu & more | ရက်ရာဇာ, ပြဿဒါး, ဥပုသ်, သမားဖြူ စသည် |
| ⚙️ Settings Page | Theme (System/Light/Dark), language, feature toggles, storage, about | ဆက်တင်များ — အပြင်အဆင်/ဘာသာ/လုပ်ဆောင်ချက် |
| 📋 Notes | Per-day notes with icons, colors, categories & attachments | နေ့အလိုက် မှတ်စုများ |
| 🗂️ Note Categories | Main + sub categories with data types (amount/time/length/weight) | မှတ်စု အမျိုးအစားများ |
| 🧮 Aggregation Modes | Sum / Net (±) / Last / Average per sub-category | တွက်နည်း — စုစုပေါင်း/အသားတင်/နောက်ဆုံး/ပျမ်းမျှ |
| 📎 Attachments | Multiple files per note, stored client-side in IndexedDB | ဖိုင်များ — ကိုယ်ပိုင် သိုလှောင်မှု |
| 📊 Analytics | Per-category totals + full dashboard with date ranges & 360° view | စာရင်းအင်း ဒက်ရှ်ဘုတ် |
| 📅 Custom Days | User-defined days: Holiday, Birthday, Anniversary, Event, Reminder | ကိုယ်ပိုင် နေ့များ |
| 💾 Storage Manager | Usage, per-file limits, attachment list with thumbnails, clear all | သိုလှောင်မှု စီမံခန့်ခွဲမှု |
| 🌓 System / Light / Dark Theme | Follows OS preference, or force light/dark — persistent | စနစ် / အလင်း / အမှောင် အပြင်အဆင် |
| � Saturday in Red | Saturday's date rendered red like Sunday — toggle in Settings → Appearance | စနေနေ့ကိုလည်း အနီရောင် ဖော်ပြရန် (ဆက်တင် → အသွင်အပြင်) || 🏢 Substitute Working Days | ကြားရက် bridge holidays come with worked Saturdays — shown black with a 🏢 badge and the reason on tap | အစားထိုး ရုံးတက်ရက် — အနီရောင် မပြဘဲ အကြောင်းရင်း ဖော်ပြသည် |
| 🎉 Fun for Employee | Counts down to the next N-day break (consecutive red days) — shown as card, toast or popup | နောက် N ရက် အနားယူရက် အထိ ရေတွက်ပေးသည် || 🌐 Language Toggle | EN / မြ segmented control | ဘာသာစကား ပြောင်းလဲနိုင် |
| 📱 Responsive | Mobile · Tablet · Desktop layouts | မိုဘိုင်း · တက်ဘလက် · ဒက်စ်တော့ |
| 📲 PWA | Installable, offline-capable via Service Worker | အင်တာနက်မပါဘဲ အသုံးပြုနိုင် |
| 🗓️ 3-View Mode | Month · Compact · List views | လ / အတိုချုပ် / စာရင်း မြင်ကွင်းများ |
| 🗓️ Month Picker | Scrollable iOS-style year + month picker popover | လနှင့်နှစ် ရွေးချယ်ပေးနိုင် |
| 🔖 Dynamic Favicon | Tab icon updates daily to show today's date | ဘရောက်ဇာ တက်ဘ်တွင် ယနေ့ရက်ဖော်ပြ |
| ⏰ Midnight Refresh | Today highlight + favicon auto-update at midnight | သန်းခေါင်တွင် ယနေ့ ရက်အလိုအလျောက်ပြောင်း |
| 👆 Swipe Navigation | Swipe left/right to change month (or week in Compact view) | ဘေးတိုက် ပွတ်ဆွဲ၍ လပြောင်းနိုင် |
| 📏 Week Separators | Thin lines between calendar weeks for readability | ရက်သတ္တပတ် ခြားမျဉ်းများ |

---

## Settings · ဆက်တင်များ

Opened via the ⚙️ gear icon in the nav bar. Compact iOS-style page with bottom sheets:

| Section | Contents |
|---|---|
| **Appearance** | 📕 Theme segmented control — System (follows OS) / Light / Dark · Saturday in Red toggle · Substitute Working Days toggle |
| **Language** | EN / မြ segmented control |
| **Features** | ⏰ Alarms toggle · 🎉 Fun for Employee (days-off countdown — days, display mode, custom title with `{n}`) |
| **Notes & Categories** | 📋 Notes toggle · 🗂️ Categories toggle · **Manage Categories** sheet |
| **Data** | 📊 Analytics sheet · 📅 Custom Days sheet · 👁️ Hide Empty Days in List toggle |
| **Storage** | 💾 Storage sheet — usage, limits, all attachments with thumbnails, clear all |
| **About** | App logo, version, developer (Okkar Thet Naing), company (GoeTecX), website |

All management functions open in **iOS bottom sheets** (Liquid Glass) so the settings page stays compact.

---

## Notes · မှတ်စုများ

Each day can have multiple notes with:
- **Text** + emoji icon + color
- **Category** (main) + **Sub-category** — optional, from your own category tree
- **Value** — when the sub-category has a data type (e.g. 💰 50,000 MMK)
- **Attachments** — multiple files per note (see below)

Calendar cells show note badges: the **data-type icon** (💰/⏱️/📏/⚖️) for typed notes, up to 2 badges + "+N" count for multiple notes.

### Note Categories · မှတ်စု အမျိုးအစားများ

Fully user-managed (Settings → Manage Categories):
- **Main categories** (e.g. Work, Personal, Finance) with **sub-categories** (e.g. Meeting, Health, Income)
- Each sub-category can have a **data type** with a customizable unit:

| Type | Icon | Default Unit | Example |
|---|---|---|---|
| None | 📝 | — | Task, Family |
| Amount | 💰 | MMK | Income, Expense |
| Time | ⏱️ | hr | Meeting |
| Length | 📏 | m | Distance |
| Weight | ⚖️ | kg | Health |

- **Aggregation mode** per sub-category:

| Mode | Icon | Meaning |
|---|---|---|
| Sum | ∑ | Total of all values |
| Net | ± | Signed total (Income + / Expense −) |
| Last | ↗ | Latest value only (e.g. weight) |
| Average | ∅ | Mean of values |

- **Hide/Show** (eye button) — hide a category without deleting it; hidden items disappear from pickers & analytics
- Categories are stored in `localStorage` (`mm-note-categories`)

### Attachments · ဖိုင်များ

- Multiple files per note, stored **client-side in IndexedDB** (`mm-attachments`) — never uploaded
- Note stores only metadata (name, type, size) in `localStorage`
- **Viewer**: images → lightbox · text files → inline preview · PDF → embedded viewer · others → file card
- All with a **Download** button
- Smart file-type icons: 🖼️ 🎬 🎵 📄 📝 📊 🗜️ 📃 📎

---

## Analytics · စာရင်းအင်း

### Sheet (Settings → Data → Analytics)
Per-typed-sub-category totals with aggregation modes applied, this-month + all-time, entry counts.

### Dashboard (📊 button in the sheet)
Full-page analytics with:
- **Range selector** — This Month / Last Month / This Year / All Time
- **Summary cards** — Notes, Entries, Net Amount, Categories
- **Category Breakdown** — per main category with sub-category values
- **360° Analytics** — Top categories (by computed value) + Type totals (Amount/Time/Length/Weight)
- **Monthly Trend** — 6-month bar chart
- **All Notes** — full list in range with category + value badges

---

## Custom Days · ကိုယ်ပိုင် နေ့များ

User-defined special days (Settings → Data → Custom Days), shown on the calendar with a type icon badge + indigo dot:

| Type | Icon | မြန်မာ |
|---|---|---|
| Holiday | 🎌 | ရုံးပိတ် |
| Birthday | 🎂 | မွေးနေ့ |
| Anniversary | 💍 | နှစ်ပတ်လည် |
| Event | 🎉 | ပွဲ |
| Reminder | ⏰ | သတိပေးချက် |
| Other | 📌 | အခြား |

Each day: name (EN + မြန်မာ), date (month chips + day stepper), recurring (every year) toggle. Stored in `localStorage` (`mm-custom-holidays`).

---

## Storage · သိုလှောင်မှု

Settings → Storage sheet:
- **Usage summary** — total bytes + file count (live)
- **Max File Size** — 1/5/10/25/50 MB/∞ (default 10 MB)
- **Max Attachments per Note** — 3/5/10/20/∞ (default 10)
- **All Attachments** — every file across all notes with **image thumbnails**, view + delete per file
- **Clear All Attachments** — one-tap wipe with confirmation

Limits are enforced at pick time with bilingual toasts.

---

## Screen Layouts · မျက်နှာပြင် ဒီဇိုင်း

### Mobile (< 768 px)
- Full-screen edge-to-edge calendar grid
- **Public Holidays card** shown below the calendar grid for the current month
- Tap a day → full-screen slide-in Day Detail panel
- Sticky Liquid Glass nav bar: prev arrow · Today button · month/year title · Settings gear · next arrow
- Moon phase pill badge anchored to top-right of each date circle
- Dot indicators per cell: holiday · full moon · auspicious · yatyaza · pyathada
- 3-view segmented switcher (Month / Compact / List)
- Weekday header shows **short Myanmar day names** (နွေ, လာ, ဂါ…)

### Desktop / Tablet (≥ 768 px)
- Two-column layout: **calendar left** · **sticky right panel (320 px)**
- Right panel shows the month's Public Holidays list by default
- Clicking a day slides holidays out, slides Day Detail panel in with a back button
- Mobile holidays card is hidden (right panel handles it)
- Larger day cells (38 × 38 px circle), 18 px date number, 12 px Myanmar date
- Weekday header shows **full Myanmar day names** (တနင်္ဂနွေ, တနင်္လာ, အင်္ဂါ…)
- Calendar adapts to column width via container queries (no overlap at any size)

---

## Nav Bar · ခေါင်းစဥ် ဘား

### English Mode (EN)
```
[ ‹ ] [ Today ]   April 2026 ↓    [ ⚙️ ] [ › ]
                  Tagu / Kason · 1387-1388
```

### Myanmar Mode (မြ)
```
[ ‹ ] [ ယနေ့ ]   တန်ခူး / ကဆုန် · ၁၃၈၇-၁၃၈၈ ↓    [ ⚙️ ] [ › ]
                  ဧပြီ ၂၀၂၆
```

| Element | EN Mode | MM Mode |
|---|---|---|
| **Main title (month)** | Gregorian month name (`April`) | Myanmar month name (`တန်ခူး / ကဆုန်`) |
| **Main title (year)** | Gregorian year (`2026`) | Myanmar era year (`၁၃၈၇-၁၃၈၈`) |
| **Subtitle** | Myanmar romanized month + era year (`Tagu / Kason · 1387-1388`) | Gregorian month + year in Myanmar digits (`ဧပြီ ၂၀၂၆`) |

---

## Weekday Header · နေ့ရက် ခေါင်းစဥ်

| Mode | Mobile (< 768px) | Desktop (≥ 768px) |
|---|---|---|
| **EN** | Sun Mon Tue Wed Thu Fri Sat | Sun Mon Tue Wed Thu Fri Sat |
| **MM** | နွေ လာ ဂါ ဟူး တေး ကြာ နေ | တနင်္ဂနွေ တနင်္လာ အင်္ဂါ ဗုဒ္ဓဟူး ကြာသပတေး သောကြာ စနေ |

---

## Day Detail Panel · နေ့ရက် အချက်အလက်

Each day displays fully bilingual sections. EN mode uses English throughout; MM mode uses Myanmar throughout.

### 1. Holidays · ရုံးပိတ်ရက်
Public holiday name (bilingual) with optional description. Custom days show their type icon (🎂 etc.).

### 2. Myanmar Calendar · မြန်မာပြက္ခဒိန်

| EN Label | MM Label | Example EN | Example MM |
|---|---|---|---|
| Buddhist Era | ဗုဒ္ဓသာသနာ | 2569 | ၂၅၆၉ ခု |
| Myanmar Era | မြန်မာသက္ကရာဇ် | 1387 | ၁၃၈၇ ခု |
| Year Name | နှစ်အမည် | Visakha | ပိသျက်နှစ် |
| MM Date | နေ့ရက် | Tagu Full Moon 15 | တန်ခူး လပြည့် ၁၅ ရက် |
| Moon | လ | 🌕 Full Moon | 🌕 လပြည့် |

### 3. Astrology · နက္ခတ်ဗေဒင်

| EN Label | MM Label | EN Values | MM Values |
|---|---|---|---|
| Mahabote | မဟာဘုတ် | Binga / Atun / Yaza / Adipati / Marana / Thike / Puti | ဘင်္ဂ / အထွန်း / ရာဇ / အဓိပတိ / မရဏ / သိုက် / ပုတိ ဖွား |
| Nakhat | နက္ခက် | Ogre / Elf / Human | ဘီလူး / နတ် / လူ |
| Nagahle | နဂါးခေါင်း | West / North / East / South | အနောက် / မြောက် / အရှေ့ / တောင်ဘက်ပြု |

### 4. Caution · သတိပြုရက်

| Icon | EN | MM |
|---|---|---|
| 🌈 | Yatyaza Day | ရက်ရာဇာနေ့ |
| ⚠️ | Pyathada Day | ပြဿဒါးနေ့ |
| ⚠️ | Evening Pyathada | ညနေပြဿဒါးနေ့ |

### 5. Special Days · အခါကြောင်းပြ ရက်

**Auspicious (green badges):**

| Icon | EN | MM |
|---|---|---|
| ☸️ | Sabbath | ဥပုသ် |
| 🕉️ | Sabbath Eve | အဖိတ်နေ့ |
| ✅ | Amyeittasote | အမြိတ္တစုတ် |
| ⚪ | Thamaphyu | သမားဖြူ |

**Inauspicious (red badges):**

| Icon | EN | MM |
|---|---|---|
| ⚫ | Thamanyo | သမားညို |
| ⚠️ | Warameittugyi | ဝါရမိတ္တုကြီး |
| ⚠️ | Warameittunge | ဝါရမိတ္တုငယ် |
| ⚠️ | Yatpote | ရက်ပုပ် |
| 🐉 | Nagapor | နဂါးပေါ် |
| ⛔ | Yatyotema | ရက်ယုတ်မာ |
| ⛔ | Mahayatkyan | မဟာရက်ကြမ်း |
| ⚠️ | Shanyat | ရှမ်းရက် |

### 6. Notes · မှတ်စုများ
Add/view notes with category badges, value badges, and attachment chips.

### 7. Alarms · နှိုးစက်များ
Per-day alarms with time, label, toggle, and delete.

---

## List View · စာရင်းမြင်ကွင်း

| Mode | Myanmar Date Column |
|---|---|
| **EN** | `Late Tagu Full Moon 15` |
| **MM** | `နောက်ဆုံးတန်ခူး လပြည့် ၁၅ ရက်` |

Optionally **hide empty days** (no events) via Settings → Data → Hide Empty Days in List.

---

## UI Design System · ဒီဇိုင်း စနစ်

### iOS 26 Liquid Glass
- **Ambient background blobs** — three blurred radial color blobs behind all content
- **Glass surfaces** — nav bar, picker, controls use `backdrop-filter: blur()` + `saturate()` + semi-transparent backgrounds
- **Glass capsule controls** — frosted glass with glass-border and glow shadows
- **Specular highlights** — inset box-shadow on nav bar simulates a glass top edge
- **Bottom sheets** — settings management, day detail, storage, analytics all use slide-up glass sheets

### Color Tokens

| Token | Light | Dark |
|---|---|---|
| `--ios-red` | `#FF3B30` | `#FF453A` |
| `--ios-blue` | `#007AFF` | `#0A84FF` |
| `--ios-green` | `#34C759` | `#30D158` |
| `--ios-orange` | `#FF9500` | `#FF9F0A` |
| `--ios-teal` | `#30B0C7` | `#40C8E0` |
| `--ios-indigo` | `#5856D6` | `#5E5CE6` |
| `--bg` | `#F2F2F7` | `#000000` |
| `--surface` | `#FFFFFF` | `#1C1C1E` |
| `--cal-day-en` | `rgba(0,0,0,0.88)` | `rgba(255,255,255,0.92)` |
| `--cal-day-mm` | `rgba(0,0,0,0.40)` | `rgba(255,255,255,0.40)` |

### Typography
- **Font stack:** `-apple-system, SF Pro Display, SF Pro Text, Helvetica Neue, sans-serif`
- **Myanmar script:** `line-height: 1.5–1.6` to prevent stacking diacritic clipping
- **Nav title:** `overflow: visible` (no clipping of tall Myanmar glyphs)

### Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| `< 390px` | Small phone — reduced nav, dots, text |
| `< 768px` | Mobile — compact nav, short MM day names |
| `≥ 768px` | Desktop — full nav, full MM day names, two-column layout |
| `@container ≤ 520px` | Narrow calendar column — scaled cells (no overlap) |

---

## File Structure · ဖိုင်ဖွဲ့စည်းပုံ

```
├── index.html          — PWA shell, semantic HTML, settings + sheets
├── style.css           — iOS 26 Liquid Glass design system
├── app.js              — Calendar rendering, views, notes, categories, analytics, storage
├── mmcal.js            — Myanmar calendar calculation engine (JDN, astrology)
├── holidays.js         — Holiday loader (parses holidays.json + custom days)
├── holidays.json       — Holiday data: fixed annual + year-specific entries
├── workdays.js         — Office-schedule loader (ကြားရက် ↔ အစားထိုး ရုံးတက်ရက်)
├── workdays.json       — Bridge-day / substitute-working-day pairs
├── sw.js               — Service Worker (cache-first shell + network-first data)
├── manifest.json       — PWA web app manifest
├── debug.js            — Node.js script for testing mmcal.js engine
├── generate-icon.html  — Browser tool to regenerate the app icon
└── icon.png            — PWA app icon (192 × 192)
```

---

## Client-Side Storage · ကိုယ်ပိုင် သိုလှောင်မှု

| Storage | Key | Contents |
|---|---|---|
| `localStorage` | `mm-theme` | `system` / `light` / `dark` (default `system`) |
| `localStorage` | `mm-lang` | EN/မြ language |
| `localStorage` | `mm-view` | Month/Compact/List view |
| `localStorage` | `mm-notes` | Notes (text, icon, color, category, value, attachment metadata) |
| `localStorage` | `mm-note-categories` | Category tree (main + subs, types, units, aggregation) |
| `localStorage` | `mm-custom-holidays` | Custom days (name, date, type, recurring) |
| `localStorage` | `mm-alarms` | Per-day alarms |
| `localStorage` | `mm-notes-enabled` / `mm-alarms-enabled` / `mm-note-categories-enabled` | Feature toggles |
| `localStorage` | `mm-attach-max-size` / `mm-attach-max-count` | Storage limits |
| `IndexedDB` | `mm-attachments` | Attachment file blobs |

All data stays **on the client device** — nothing is uploaded.

---

## PWA & Offline · PWA နှင့် Offline
- **Offline date** — reads device clock (`new Date()`) — no network required
- **Midnight auto-refresh** — `today` reference updates at midnight and re-renders
- **Service Worker** (`sw.js`) — cache-first + background refresh
- **Web App Manifest** — `short_name: "MM Calendar"`, `display: standalone`
- **iOS PWA** meta tags for Safari home-screen installation
- **Dynamic favicon** — canvas-generated, refreshes at midnight

---

## Bilingual UI · ဘာသာ ၂ မျိုး

The `t(en, mm)` helper returns the correct string for `currentLang` throughout `app.js`. CSS class pairs `.t-en` / `.t-mm` control visibility; `[data-lang]` on `<html>` drives the toggle.

---

## Month/Year Picker · လ/နှစ် ရွေးချယ်ခြင်း

Clicking the header title opens a `position: fixed` Liquid Glass popover:
- Scrollable **year column** (1950–2100)
- **Month grid** (Jan–Dec / တန်ခူး–တပေါင်း)
- "Today" shortcut button
- Closes on outside click, Escape, or month selection

---

## Holiday Data · ရုံးပိတ်ရက် ဒေတာ

Edit `holidays.json` to add or update holidays:

```json
{
  "fixed": [
    { "month": 1, "day": 4, "name": "Independence Day", "nameMM": "လွတ်လပ်ရေးနေ့" }
  ],
  "byYear": {
    "2026": [
      { "month": 4, "day": 13, "name": "Thingyan Holiday", "nameMM": "သင်္ကြန်ရုံးပိတ်", "description": "သင်္ကြန် အကြို" }
    ]
  }
}
```

- `fixed` — repeats every year on the same Gregorian date
- `byYear` — year-specific entries
- Optional `"description"` shown as a subtitle in holiday rows

### Fixed Annual Holidays

| Date | English | မြန်မာ |
|---|---|---|
| Jan 1–2 | New Year Holiday | နှစ်သစ်ကူးရုံးပိတ် |
| Jan 4 | Independence Day | လွတ်လပ်ရေးနေ့ |
| Feb 12–13 | Union Day | ပြည်ထောင်စုနေ့ |
| Mar 2 | Peasants' Day | တောင်သူလယ်သမားနေ့ |
| Mar 27 | Armed Forces Day | တပ်မတော်နေ့ |
| May 1 | Labour Day | အလုပ်သမားနေ့ |
| Jul 19 | Martyrs' Day | အာဇာနည်နေ့ |
| Dec 4 | National Victory Day | အမျိုးသားအောင်ပွဲနေ့ |
| Dec 25 | Christmas Day | ခရစ္စမတ်နေ့ |

**2026:** Chinese New Year (Feb 16–17), Thingyan (Apr 11–19), Kason Full Moon (Apr 30), Waso Full Moon (Jul 29), Thadingyut (Oct 25–27), Tazaungdaing (Nov 23–24)

**2027:** Chinese New Year (Jan 28–29), Thingyan (Apr 13–17), Kason Full Moon (May 20), Waso Full Moon (Aug 18), Thadingyut (Nov 13–15), Tazaungdaing (Dec 12–13)

---

## Running Locally · ဒေသတွင်း စမ်းသပ်ခြင်း

```bash
cd mmclaendar_pwa
python3 -m http.server 8080
# open http://localhost:8080
```

> Must be served over HTTP/HTTPS (not `file://`) for the Service Worker to register.

```bash
node debug.js   # test mmcal.js engine
```

---

## Myanmar Calendar Engine · မြန်မာ ပြက္ခဒိန် အင်ဂျင်

`mmcal.js` implements the traditional Myanmar lunisolar calendar (based on [yan9a/mmcal](https://github.com/yan9a/mmcal)):

- Solar year: 365.2587565 days · Lunar month: 29.53058795 days
- All historical eras: Makaranta I & II, Thandeikta, British era, modern era
- Intercalary (Watat) years with second Waso month

### Core Conversion Functions

| Function | Description |
|---|---|
| `w2j(y, m, d)` | Gregorian date → Julian Day Number |
| `j2m(jdn)` | Julian Day Number → Myanmar date `{my, mm, md, myt}` |
| `calMy(my)` | Myanmar year constants `{myt, tg1, fm, werr}` |
| `calWatat(my)` | Check intercalary (Watat) year `{fm, watat}` |
| `getMyConst(my)` | Era-specific constants `{EI, WO, NM, EW}` |
| `getFortnightDay(md)` | Day of month → fortnight day (1–15) |
| `getMonthLength(mm, myt)` | Month length (29 or 30 days) |

### Name Getter Functions (Bilingual Pairs)

| MM Getter | EN Getter | Returns |
|---|---|---|
| `getMonthNameMM(mm)` | `getMonthNameEN(mm)` | Month name by index 0–14 |
| `getMoonPhaseMM(md,mm,myt)` | `getMoonPhaseEN(md,mm,myt)` | Waxing / Full Moon / Waning / New Moon |
| `getMahaboteMM(v)` | `getMahaboteEN(v)` | Planetary sign (0–6) |
| `getNakhatMM(v)` | `getNakhatEN(v)` | Ogre / Elf / Human |
| `getNagahleMM(v)` | `getNagahleEN(v)` | West / North / East / South |
| `getYearNameMM(v)` | `getYearNameEN(v)` | 12-year Sanskrit cycle (0–11) |
| `getThamanyoMM(v)` | `getThamanyo(v)` | White (even) / Black (odd) |
| `getDayNameMM(wd)` | `getDayName(wd)` | Weekday name |
| `getBuddhistEra(my)` | — | Buddhist Era = MY + 1182 |

### Myanmar Month Names (Index 0–14)

| Index | `getMonthNameEN` | `getMonthNameMM` |
|---|---|---|
| 0 | First Waso | ပထမဝါဆို |
| 1 | Tagu | တန်ခူး |
| 2 | Kason | ကဆုန် |
| 3 | Nayon | နယုန် |
| 4 | Waso | ဝါဆို |
| 5 | Wagaung | ဝါခေါင် |
| 6 | Tawthalin | တော်သလင်း |
| 7 | Thadingyut | သီတင်းကျွတ် |
| 8 | Tazaungmon | တန်ဆောင်မုန်း |
| 9 | Nadaw | နတ်တော် |
| 10 | Pyatho | ပြာသို |
| 11 | Tabodwe | တပို့တွဲ |
| 12 | Tabaung | တပေါင်း |
| 13 | Late Tagu | နောက်ဆုံးတန်ခူး |
| 14 | Late Kason | နောက်ဆုံးကဆုန် |

### Astrological Calculation Functions

| Function | Input | Output |
|---|---|---|
| `calYatyaza(mm, wd)` | month, weekday (0=Sat…6=Fri) | 1=Yatyaza, 0=none |
| `calPyathada(mm, wd)` | month, weekday | 1=Pyathada, 2=afternoon, 0=none |
| `calSabbath(md, mml)` | day of month, month length | `{sabbath, sabbatheve}` |
| `calMahabote(my, wd)` | Myanmar year, weekday | 0–6 sign index |
| `calNakhat(my)` | Myanmar year | 0=Ogre, 1=Elf, 2=Human |
| `calNagahle(mm)` | month | 0=West, 1=North, 2=East, 3=South |
| `calThamanyo(my)` | Myanmar year | 0=White, 1=Black |
| `calYearName(my)` | Myanmar year | 0–11 cycle index |
| `calThamaphyu(d, wd)` | fortnight day, weekday | 1/0 |
| `calAmyeittasote(d, wd)` | fortnight day, weekday | 1/0 |
| `calThamanyoDay(mm, wd)` | month, weekday | 1/0 |
| `calWarameittugyi(d, wd)` | fortnight day, weekday | 1/0 |
| `calWarameittunge(d, wd)` | fortnight day, weekday | 1/0 |
| `calYatpote(d, wd)` | fortnight day, weekday | 1/0 |
| `calNagapor(md, wd)` | day of month, weekday | 1/0 |
| `calYatyotema(mm, d)` | month, fortnight day | 1/0 |
| `calMahayatkyan(mm, d)` | month, fortnight day | 1/0 |
| `calShanyat(mm, d)` | month, fortnight day | 1/0 |

**Weekday encoding:** `0=Saturday, 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday`
In `app.js`: `wdMM = (Date.getDay() + 1) % 7`

---

## app.js Key Functions

| Function | Description |
|---|---|
| `t(en, mm)` | Returns correct language string |
| `toMM(num)` | Arabic → Myanmar digits (`2026` → `၂၀၂၆`) |
| `getDayData(y, m, d)` | All computed data for a day |
| `getMmMonthLabel(y, m)` | `{mmMonthStr, mmYearStr, enMonthStr, enYearStr}` |
| `updateNavHeader()` | Renders bilingual nav title + subtitle |
| `renderDays(y, m)` | Month-view calendar grid |
| `renderList()` | List/agenda view with bilingual dates |
| `renderCompact()` | Compact week-strip view |
| `buildDayInfoHtml(y, m, d, data)` | Fully bilingual day detail HTML (5 sections) |
| `showDayInfo(y, m, d, cell)` | Shows day detail panel or bottom sheet |
| `renderHolidaysList(y, m)` | Right panel / mobile holidays card |
| `generateDateFavicon()` | Canvas date favicon + midnight refresh |

---

## Technology · နည်းပညာ

- **Vanilla JS** — no frameworks, no build tools, no dependencies
- **CSS custom properties** — full light/dark theme via `[data-theme="dark"]` on `<html>`
- **Language switching** — `[data-lang]` on `<html>` + `.t-en` / `.t-mm` CSS class pairs
- **Service Worker** — cache-first + background-refresh strategy
- **Canvas API** — dynamic date favicon, refreshes at midnight
- **Web App Manifest** — installable PWA for iOS and Android

---

## Browser Compatibility

| Browser | Minimum |
|---|---|
| Chrome / Edge | 90+ |
| Firefox | 88+ |
| Safari | 14+ |

---

## Changelog · အပြောင်းအလဲမှတ်တမ်း

### v3.0 — Full Bilingual Engine
- All day detail labels, values, and badges fully bilingual (EN/MM)
- Added EN getters to `mmcal.js`: `getMoonPhaseEN`, `getMahaboteEN`, `getNakhatEN`, `getNagahleEN`, `getYearNameEN`, `getMonthNameEN`
- List view: `Late Tagu Full Moon 15` (EN) / `နောက်ဆုံးတန်ခူး လပြည့် ၁၅ ရက်` (MM)
- Compact header fully bilingual
- Nav: EN shows Gregorian main + Myanmar subtitle; MM shows Myanmar main + Gregorian subtitle
- Myanmar era year in Myanmar title; Gregorian year in EN title
- Weekday header: short names mobile, full names ≥768px; EN hides all Myanmar names

### v2.5 — Icon Updates
- Sabbath icon → ☸️; Yatyaza icon → 🌈

### v2.4 — Live Features
- Auto-refresh at midnight; mobile holidays card below grid

### v2.3 — Cell Improvements
- 38 × 38 px cells; `--cal-day-en` / `--cal-day-mm` tokens

### v2.2 — Myanmar Script Fixes
- `line-height: 1.6` and `overflow: visible` on nav title

### v2.1 — UI Polish
- Unified Liquid Glass capsule (Theme + Language segmented controls)

### v2.0 — iOS 26 Liquid Glass Redesign
- Full rebuild; 3-view mode; ambient blobs; glass nav

---

## Developer · တည်ဆောက်သူ

**GoeTecX** · [goetecx.com](https://goetecx.com)

Myanmar Calendar Algorithm based on [yan9a/mmcal](https://github.com/yan9a/mmcal).

---

## License

MIT License — Free to use and modify.

---

Made with ❤️ for Myanmar
