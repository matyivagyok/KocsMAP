# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KocsMAP is a Hungarian pub/bar tracker web app ("kocsma" = pub in Hungarian). It displays pubs on an interactive map, allowing users to add, edit, and delete entries. The project lives entirely in the `kocsma-tracker/` subdirectory. Community-based webapp for discovering and comparing venues (pubs, bars). 
Users can add locations, edit price lists, leave ratings, and share real-time presence.


## Commands

All commands must be run from `kocsma-tracker/`:

```bash
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

No test suite is configured.


## Planned features (not yet built)
- User auth (email/password via Firebase Auth)
- Ratings & reviews per venue
- Real-time presence ("I'm here now")
- Search & filtering
- Price lists
- Responsive/mobile layout


## Architecture

The app is a single-component React + Vite SPA with no routing. All logic lives in `src/App.jsx`.

**Data layer:** Firebase Firestore collection `kocsmak` stores pub records with fields: `nev` (name), `cim` (address), `nyitvatartas` (hours string, e.g. `"12:00 - 02:00"`), `lat`, `lng`. Firebase is initialized in `src/firebase.js` and `db` is exported for use in App.jsx.

**Map layer:** Mapbox GL JS renders the full-screen map. The Mapbox access token and custom map style (`mapbox://styles/matyivagyok/...`) are hardcoded in `App.jsx`. Markers are managed via `markersRef` (an array of `mapboxgl.Marker` instances) and are re-created from scratch whenever `kocsmak` state changes.

**UI state machine:** Three mutually exclusive UI states are managed via React state:
1. **Browse** — default; clicking a marker opens the slide-in `info-panel` on the right
2. **Adding mode** — `isAddingMode=true`; cursor becomes crosshair; next map click sets `formLocation` and opens the centered `add-form-panel`
3. **Editing** — `isEditing=true`, `editingId` holds the Firestore doc ID; same `add-form-panel` used for edits, pre-populated from `startEditing()`

**Global variable workaround:** `window.isAddingModeGlobal` is used to communicate `isAddingMode` into the Mapbox click handler (which closes over the initial state on mount). This is intentional — the map's `click` listener is registered once in `useEffect([], [])` and cannot read updated React state directly.

**Opening hours format:** Stored as a single string `"HH:MM - HH:MM"`. Split on `" - "` to extract start/end for the time picker inputs; rejoined on save via template literal in `handleSave`.
