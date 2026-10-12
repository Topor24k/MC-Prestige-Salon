# M&C Prestige Salon Management System

A React web app for **M&C Prestige Hair and Nail Salon** (Matina Crossing, Davao City), built from the
CS12L Software Engineering I project paper. It is the salon's back office: staff sign in, then manage
the four subsystems the paper proposes.

| Page | Subsystem | What it does |
| --- | --- | --- |
| **Dashboard** | Analytics & Reporting | Revenue, appointments, new clients and average value; revenue trend; Hair vs Nail bookings; top services and returning clients; rule-based recommendations; period filter; report export |
| **Appointments** | Appointment & Booking | Add a customer booking with hair length and add-ons; status updates, reschedule and delete; double-booking check; search, filters, CSV export |
| **Financial Report** | Financial Management | Gross Sales, Expenses and Net Sales; daily Credit and Debit entries with a confirmation step; CSV import and export |
| **Customers** | Customer & Service | Profiles with generated Customer IDs, walk-ins, notes, service history |
| **Services** | Customer & Service | The price list: one price or Short / Medium / Long, duration, active or inactive |

Every address leads to the staff sign-in until someone is signed in. On phones the app behaves like
one: a floating tab bar, bottom sheets instead of dialogs, card lists instead of tables. It can be
added to the home screen.

## Getting around quickly

| Keys | What happens |
| --- | --- |
| `Ctrl` / `⌘` + `K` | Command palette: jump to a page, start something new, or find a customer or service by name |
| `G` then `D` `A` `F` `C` `S` | Go to Dashboard, Appointments, Financial Report, Customers, Services |
| `N` | The current page's main action (new appointment, new entry, new customer, new service) |
| `/` | Focus the page's search box |
| `[` | Collapse or expand the sidebar |

The page's main action is always in the same place: the top bar on desktop, the floating button on
phones.

## Signing in

Staff sign in with the built-in administrator account defined in `src/data/defaultAdmin.js`. That
file holds a name, an email, a salt and a hash — never the password. To change any of them:

```bash
npm run admin:set
```

Set `DEFAULT_ADMIN` to `null` in that file and the first visit creates the administrator instead.

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

```bash
npm run build       # production build in dist/
npm run preview     # serve the production build locally
npm run typecheck   # TypeScript check, no output files
```

## Design: "The Calm Path"

A calm, nature-inspired interface: misty off-white and pale sky surfaces, leaf and forest green for
navigation and key information, hazy blue-gray for what is secondary, and one soft yellow mark per
screen to guide the eye. Titles and large figures are set in a soft serif (Fraunces); everything else
in Inter.

- **Theme tokens** live in `src/styles/theme.css` under `@theme`: colours, fonts, radii, shadows, the
  8px spacing step and motion timings. Tailwind CSS turns them into utilities (`bg-mist`,
  `text-forest`, `rounded-lg`, `shadow-soft` …) and into CSS variables (`var(--color-mist)` …) that the
  stylesheets are written with. Change a token there and every page follows. The same timings are
  mirrored for Framer Motion in `src/lib/motion.ts`.
- **Every page has the same rhythm**: a label, the title and one line of context; then the summary
  figures; then the main working area; then secondary detail.
- **Motion** is slow and never bouncy (300–600ms, one easing curve): pages drift up in a soft stagger,
  figures count up, charts draw from left to right, cards lift slightly under the pointer, and a
  low-contrast band of hills drifts behind the header. All of it stands still for anyone who prefers
  reduced motion.
- **Tables** keep their header in view under the top bar when they fit the card, and scroll sideways
  when they do not. Row actions appear when a row is pointed at or focused.

## Where things are

```
scripts/set-admin.mjs        sets the built-in administrator (npm run admin:set)
src/
  main.tsx, App.tsx          entry point, routes and the sign-in guard
  types.ts                   shapes of the salon's records
  store/SalonProvider.jsx    salon data and every create / update / delete action
  store/AuthProvider.jsx     the administrator account, sign-in, sign-out
  store/useSalon.ts, useAuth.ts   hooks the pages use to read them
  data/catalog.js            salon details, the price list, recorded 2025 figures
  data/defaultAdmin.js       the built-in administrator (salt and hash only)
  data/seed.js               builds the sample dataset
  lib/                       formatting, prices, periods, CSV, analytics, passwords, motion tokens
  hooks/                     media queries, keyboard shortcuts, palette commands, sticky tables
  components/layout/         app shell, sidebar, top bar, phone tab bar, ambient header
  components/ui/             dialogs / sheets, menus, command palette, summary cards, form pieces
  components/charts/         revenue chart, bookings chart
  pages/auth/                staff sign-in
  pages/dashboard … services one folder per admin page
  styles/theme.css           design tokens (start here)
  styles/                    base, layout, components, page styles
```

The app shell, the shared components, the sign-in page and the hooks are TypeScript. The five page
files, the charts, the data providers and the calculation helpers in `lib/` are still JavaScript.

## About the data

- There is **no backend yet**. Everything is stored in the browser (`localStorage`), so data stays on
  the device it was entered on. The paper's Laravel + MySQL backend would replace
  `src/store/SalonProvider.jsx` and `src/store/AuthProvider.jsx`.
- **Sign-in is a convenience, not security.** The password is checked in the browser, and the
  administrator's hash ships with the site, so anyone can read it and try guesses — use a password
  for it that is not used anywhere else. Real protection needs the backend.
- The **price list** in `src/data/catalog.js` is the salon's published menu. Service durations are
  estimates — set the real ones on the Services page.
- The app starts with **sample data**. July–December 2025 monthly totals match the paper's Financial
  Overview exactly; later months, customer names and phone numbers are generated. Use the account
  menu (top right) → **Reset sample data** to restore it.
- Recommendations on the Dashboard are computed from rules over the selected period's data
  (`buildRecommendations` in `src/lib/analytics.js`); there is no AI model behind them.

Earlier versions — the original static HTML / CSS / JS pages — remain in the git history.
