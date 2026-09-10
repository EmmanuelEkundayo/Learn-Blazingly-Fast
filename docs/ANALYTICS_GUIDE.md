# 📊 Analytics & Product Intelligence Guide

Welcome to the analytics guide for **Learn Blazingly Fast**!

This project implements a dual-layer analytics architecture designed for privacy, deep product insights, and public transparency:

1. **PostHog (Product & Event Analytics)**: Detailed product analytics, custom event tracking, conversion funnels, session replays, and learning paths.
2. **GoatCounter (Open Public Analytics)**: Privacy-preserving, cookieless web traffic analytics that can be shared transparently with your community.
3. **In-App Open Stats (`/stats`)**: A dedicated public dashboard displaying concept counts, interactive simulation engines, learning progress metrics, and direct links to public traffic.

---

## ⚡️ Quick Start: Setting Up PostHog (5 Minutes)

PostHog is free for up to **1,000,000 events and 5,000 session recordings per month**, which is more than enough for thousands of active learners.

### 1. Create a Free Account
1. Go to [posthog.com](https://posthog.com) and click **Get started free**.
2. Sign up with GitHub or Google.
3. Choose your data region:
   - **US Cloud** (recommended for global traffic): `https://us.i.posthog.com`
   - **EU Cloud** (GDPR data residency): `https://eu.i.posthog.com`
4. Create a project name (e.g., `learn-blazingly-fast`).

### 2. Copy Your Project API Key
1. In PostHog, click the **Settings** gear icon (bottom left) → **Project**.
2. Locate **Project API Key** (starts with `phc_...`).
3. Note your **API Host** (`https://us.i.posthog.com` or `https://eu.i.posthog.com`).

### 3. Add to Your Environment
In the root directory of your project, create or open your `.env` file:

```bash
# PostHog Configuration
VITE_POSTHOG_KEY=phc_your_actual_key_here
VITE_POSTHOG_HOST=https://us.i.posthog.com

# Open Analytics (GoatCounter)
VITE_GOATCOUNTER_URL=https://learnblazinglyfast.goatcounter.com
```

> **Note on Safety:** If `VITE_POSTHOG_KEY` is not provided, the app automatically switches to a silent development mock. The platform will never crash, stall, or log errors in the browser console.

### 4. Deploying to Vercel / Netlify
When hosting on Vercel or Netlify:
1. Go to your project settings → **Environment Variables**.
2. Add `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST`.
3. Trigger a redeploy. PostHog will immediately begin capturing analytics in production.

---

## 🎯 What We Track (And Why)

Every event is structured to answer key questions about how learners interact with the platform:

| Event Name | Trigger | Key Properties | Purpose |
| :--- | :--- | :--- | :--- |
| `$pageview` | Route change in SPA | `path`, `title`, `url` | Traffic volume across routes (`/browse`, `/concept/:slug`, `/stats`) |
| `concept_viewed` | Learner opens a concept page | `slug`, `title`, `domain`, `category`, `difficulty`, `hasVisualization`, `hasExercise` | Identify most popular & under-visited topics |
| `exercise_attempted` | Submits an interactive exercise | `slug`, `title`, `domain`, `passed`, `exerciseType` | Measure curriculum difficulty and drop-off points |
| `share_card_triggered`| Clicks Share / Copies Card Image / Native Share | `slug`, `title`, `platform` (x_twitter, clipboard, download, native), `method` | Measure viral growth and social shares |
| `search_performed` | Searches via Command Palette (`Cmd+K`) | `query`, `resultsCount`, `selectedItem` | Discover what users search for and identify content gaps |
| `roadmap_progress` | Follows a structured roadmap | `roadmapSlug`, `completedCount`, `totalCount`, `percentage` | Track long-term learner retention and journey completion |

---

## 🧭 How to Use the PostHog Dashboard

Once events start arriving, here is how to navigate and get actionable insights from PostHog:

### 1. Live Events Stream
- In the PostHog left sidebar, click **Activity** → **Live Events**.
- Click around the app or solve an exercise; you will see `concept_viewed` and `exercise_attempted` appear in real time.
- Click any event to inspect its properties (e.g., whether the exercise passed or failed).

### 2. Build a Concept Difficulty Insight
Want to see which concepts are too hard for learners?
1. Click **Product Analytics** → **New Insight** → **Trends**.
2. In **Series A**, select `exercise_attempted`.
3. Click **Filter by event property** → `passed` = `false`.
4. Group by `slug` or `title`.
5. Change chart type to **Bar Value**.
6. You now have a live chart of the hardest concepts on the platform!

### 3. Build a Learning Funnel
Want to measure conversion from viewing a concept to completing an exercise:
1. Click **Product Analytics** → **New Insight** → **Funnels**.
2. Step 1: `concept_viewed`.
3. Step 2: `exercise_attempted`.
4. Step 3: `exercise_attempted` where `passed = true`.
5. Step 4 (optional): `share_card_triggered`.
6. This shows where learners drop off and helps you improve the learning curve.

### 4. Session Replay (Watch How Real Users Interact)
Session Replay lets you watch video-like reconstructions of user sessions (with sensitive text masked for privacy):
1. In PostHog sidebar, go to **Session Replay**.
2. Filter by events: e.g., sessions where `exercise_attempted` failed, or users visited `/math`.
3. Watch how users interact with interactive canvases, step controls, and quizzes to spot UI confusion.

---

## 🌐 Open Analytics (GoatCounter)

Learn Blazingly Fast believes in open-source transparency. The platform includes **GoatCounter** for public traffic metrics.

### How It Works
- **No cookies**: Does not track users across websites, does not store persistent identifiers.
- **GDPR & CCPA compliant**: No annoying cookie consent banners required.
- **SPA Aware**: Built-in bridge in `Layout.jsx` calls `trackPageView(path)` on every client-side page transition.

### Setting Up Your Public Dashboard
1. Sign up for free at [goatcounter.com](https://www.goatcounter.com).
2. Choose a site code (e.g. `learnblazinglyfast`).
3. In GoatCounter settings:
   - Check **Make statistics publicly viewable** so your community can see the traffic.
4. Set your environment variable:
   ```bash
   VITE_GOATCOUNTER_URL=https://learnblazinglyfast.goatcounter.com
   ```
5. Anyone visiting `/stats` or clicking **Open Analytics** in the footer can view your live public dashboard.

---

## 💻 Developer Guide: Adding New Custom Events

If you create a new feature (e.g. a new algorithm simulator or math calculator) and want to track it:

```javascript
import { trackEvent } from '../services/analytics.js'

// Example: Tracking a custom algorithm reset or speed change
function handleSpeedChange(newSpeed) {
  setSpeed(newSpeed)
  trackEvent('simulator_speed_changed', {
    concept: 'dijkstras-algorithm',
    speed: newSpeed,
  })
}
```

All methods are documented in [`src/services/analytics.js`](../src/services/analytics.js):
- `trackPageView(path, title)`
- `trackConceptView(concept)`
- `trackExerciseAttempt({ slug, title, domain, passed, exerciseType })`
- `trackShare({ slug, title, platform, method })`
- `trackSearch({ query, resultsCount, selectedItem })`
- `trackRoadmapProgress({ roadmapSlug, completedCount, totalCount, percentage })`
- `identifyUser(distinctId, properties)`
- `resetUser()`

---

## 🛡️ Privacy & Compliance
- IP addresses are anonymized by default.
- No personal identifiable information (PII) is stored without consent.
- Analytics gracefully respect browser "Do Not Track" headers where configured.
