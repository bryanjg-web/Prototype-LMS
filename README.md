# Hertz LMS — Lead Management System Prototype

An interactive prototype demonstrating insurance replacement lead conversion workflows for Hertz. Users pick a role (Branch Manager, General Manager, or Admin) and explore either a guided walkthrough or a fully interactive demo of that role's workflow.

**This is a presentation prototype** — there is no backend. All data is hand-crafted mock data embedded in the app.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

| Command           | Description                    |
|-------------------|--------------------------------|
| `npm run dev`     | Start dev server (Vite + HMR) |
| `npm run build`   | Production build to `dist/`   |
| `npm run preview` | Preview production build       |
| `npm run lint`    | Run ESLint                     |

## Tech Stack

- **React 19** + **Vite 7**
- **Tailwind CSS v4**
- **Framer Motion** for animations and transitions

## App Modes

### Interactive Demo
A product-like experience with sidebar navigation. Users can freely explore dashboards, lead queues, detail views, and compliance tools for their selected role.

### Guided Tour (Customer Journeys)
Step-by-step walkthroughs with animated transitions. Navigate with arrow keys, on-screen buttons, or progress dots.

## Roles

| Role | What they do |
|------|-------------|
| **Branch Manager** | Reviews cancelled/unused leads, adds comments explaining outcomes, tracks enrichment compliance |
| **General Manager** | Monitors conversion rates and compliance across branches, reviews cancelled leads for mismatches, issues directives, spot-checks branches |
| **Admin** | Uploads HLES and TRANSLOG data files, manages org mapping (BM/Branch/AM/GM/Zone hierarchy) |

## Data

All sample data lives in `src/data/mockData.js` — 12 leads across 4 branches with realistic translog entries, org mappings, weekly trends, and leaderboard data. No external data files or API calls required.

## Project Structure

```
src/
├── App.jsx                  # Root — mode router (demo vs journey)
├── main.jsx                 # React DOM mount
├── index.css                # Tailwind import
├── data/mockData.js         # All mock data
├── config/navigation.js     # Role metadata, sidebar nav, view registry
├── context/AppContext.jsx   # Global state (role, mode, view)
├── selectors/demoSelectors.js  # Computed stats and filters
├── components/              # Shared presentational components
├── components/interactive/  # Stateful interactive demo views
├── components/layout/       # App chrome (top bar, sidebar)
└── walkthroughs/            # Step-by-step guided tour sequences
```
