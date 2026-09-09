# Contributing to Learn Blazingly Fast ⚡️

First off, thank you for considering contributing to **Learn Blazingly Fast**! 🎉

Whether you're fixing a typo, adding a new interactive visualization, writing a cheat sheet, or polishing mobile responsiveness, your contributions make computer science and software engineering education accessible and enjoyable for thousands of developers.

---

## 🧭 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Good First Issues](#good-first-issues)
3. [Local Development Setup](#local-development-setup)
4. [Project Architecture](#project-architecture)
5. [How to Contribute](#how-to-contribute)
   - [Adding a New Concept](#1-adding-a-new-concept)
   - [Enhancing or Adding a Visualization](#2-enhancing-or-adding-a-visualization)
   - [Adding a Cheat Sheet](#3-adding-a-cheat-sheet)
6. [Testing & Quality Checks](#testing--quality-checks)
7. [Submitting a Pull Request](#submitting-a-pull-request)
8. [Questions or Help](#questions-or-help)

---

## 🤝 Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Please be respectful, constructive, and kind in all discussions, code reviews, and issue tickets.

---

## 🎯 Good First Issues

Looking for an easy way to get started? Check out our beginner-friendly issues tagged with **[`good first issue`](https://github.com/EmmanuelEkundayo/Learning-Platform/labels/good%20first%20issue)**:

- [#1: Add interactive visual simulation for Dijkstra's Algorithm](https://github.com/EmmanuelEkundayo/Learning-Platform/issues/1)
- [#2: Create syntax and concurrency cheat sheet for Go and Rust](https://github.com/EmmanuelEkundayo/Learning-Platform/issues/2)
- [#3: Optimize mobile touch responsiveness on Canvas visualizations](https://github.com/EmmanuelEkundayo/Learning-Platform/issues/3)
- [#4: Add interactive visualization for A* Search pathfinding on 2D grid](https://github.com/EmmanuelEkundayo/Learning-Platform/issues/4)

Feel free to comment on any issue to claim it!

---

## 🚀 Local Development Setup

### Prerequisites

- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **Git**: Installed and configured

### 1. Clone the Repository

```bash
git clone https://github.com/EmmanuelEkundayo/Learning-Platform.git
cd Learning-Platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Vite will hot-reload automatically as you edit files.

### 4. Run the Test Suite

```bash
npm test
```

### 5. Verify Production Build

```bash
npm run build
```

---

## 📂 Project Architecture

Here's an overview of how the codebase is organized:

```text
Learning-Platform/
├── src/
│   ├── components/
│   │   ├── visualizations/   # 14 interactive visualization engines (SVG, Canvas, D3, DOM)
│   │   │   ├── ArchDiagram.jsx     # Tiered architecture diagrams
│   │   │   ├── StateDiagram.jsx    # State machines and lifecycle graphs
│   │   │   ├── TreeCanvas.jsx      # BST, AVL, Trie, BFS/DFS tree traversals
│   │   │   ├── GraphCanvas.jsx     # Graph node & edge algorithms
│   │   │   ├── MatrixGrid.jsx      # 2D DP matrices & grid search
│   │   │   ├── StepControls.jsx    # Playback bar (play/pause, speeds, scrubbing)
│   │   │   └── ...
│   │   ├── exercises/        # Interactive exercises (Fill-in-blank, Spot-the-bug, Quizzes)
│   │   └── ui/               # Layout, Navbar, SearchPalette, SEO, Toaster
│   ├── data/
│   │   ├── concepts/         # 550+ concept JSON files (DSA, ML, Frontend, Backend, etc.)
│   │   ├── cheatsheets/      # Syntax & pattern cheat sheets (Python, JS, TS, SQL, Docker)
│   │   ├── roadmaps/         # Career roadmaps (Frontend, Backend, ML Engineer, DevOps)
│   │   └── math/             # Fast mental math tricks and geometric proofs
│   ├── store/                # Zustand stores (progressStore, conceptStore, notesStore)
│   ├── utils/                # Helper utilities (Pyodide Python runtime, shareCard, SEO)
│   └── pages/                # Route views (Home, Browse, Concept, Projects, Roadmaps)
├── public/                   # Static assets, logos, favicon, OG cards
└── docs/                     # Documentation images and screenshots
```

---

## 🛠️ How to Contribute

### 1. Adding a New Concept

Each concept lives in `src/data/concepts/<slug>-01.json`.

**Required schema structure:**
```json
{
  "id": "my-new-concept",
  "slug": "my-new-concept",
  "title": "My New Concept",
  "domain": "Frontend", // DSA | ML | AI | Frontend | Backend | Software Engineering
  "category": "State Management",
  "difficulty": "intermediate", // beginner | intermediate | advanced
  "tags": ["react", "state", "architecture"],
  "card": {
    "intuition": "A short, memorable 1-2 sentence explanation.",
    "analogy": "A real-world analogy to build mental models.",
    "time_complexity": "O(1)",
    "space_complexity": "O(N)",
    "when_to_use": [
      "When managing complex multi-component state",
      "When tracking optimistic updates"
    ],
    "gotchas": [
      "Avoid mutating state directly in renders"
    ]
  },
  "visualization": {
    "type": "state-diagram", // One of the 14 supported visualization types
    "config": {
      "mode": "state-management"
    }
  },
  "exercise": {
    "type": "fill-in-the-blank",
    "prompt": "Fill in the blank to dispatch an action:",
    "starter_code": "dispatch({ type: ___________ })",
    "solution": "dispatch({ type: 'ADD_ITEM' })"
  }
}
```

Once added, register it in `src/data/concepts/index.js` (or ensure your JSON file is imported in the registry).

---

### 2. Enhancing or Adding a Visualization

Visualizations are self-contained React components in `src/components/visualizations/`.

- Every visualization receives a `config` prop from the concept JSON.
- Visualizations should hook into `StepControls.jsx` for consistent playback (Play, Pause, Step Next/Prev, Speed Multipliers).
- Ensure visualizations are responsive and touch-friendly on screens 375px and wider.

---

### 3. Adding a Cheat Sheet

1. Create a JSON file in `src/data/cheatsheets/<topic>.json`.
2. Structure sections into `title`, `description`, and `sections: [{ heading, items: [{ label, code, tip }] }]`.
3. Register the sheet in `src/data/cheatsheets/index.js`.

---

## 🧪 Testing & Quality Checks

Before committing and submitting your PR, ensure all tests pass and the production bundle builds cleanly:

```bash
# 1. Run unit tests
npm test

# 2. Verify production build
npm run build
```

---

## 🚀 Submitting a Pull Request

1. **Create a branch**:
   ```bash
   git checkout -b feat/add-dijkstra-visualizer
   ```
2. **Make your changes** following existing conventions.
3. **Commit with a descriptive message**:
   ```bash
   git commit -m "feat(viz): add Dijkstra weighted graph visualizer"
   ```
4. **Push to your fork**:
   ```bash
   git push origin feat/add-dijkstra-visualizer
   ```
5. **Open a Pull Request** on GitHub against the `main` branch.
   - Describe what changed and why.
   - Include before/after screenshots or GIFs if your changes impact the UI.
   - Link any related issues (e.g., `Closes #1`).

---

## 💬 Questions or Help?

If you have questions, encounter an issue, or want to discuss a new idea:
- Open a GitHub issue or start a discussion.
- Reach out via email at `emmanuelekundayo1234@gmail.com` or on X [@ekunday00](https://twitter.com/ekunday00).

Happy hacking! ⚡️
