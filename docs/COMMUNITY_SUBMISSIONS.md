# 🚀 Community & Directory Submission Tracker

This document contains pre-formatted submission blurbs, direct repository links, and guidelines for listing **Learn Blazingly Fast** across top developer directories, curated "Awesome" lists, and FMHY.

---

## 📋 Submission Guidelines & Rules of Thumb

List maintainers reject spammy or promotional PRs. To ensure a 100% acceptance rate:
1. **Never use hype adjectives**: Avoid words like *"the best"*, *"revolutionary"*, or *"unmatched"*. Use neutral, descriptive language (e.g., *"Free, open-source interactive learning platform with visual simulations and quizzes for 550+ computer science and ML concepts."*).
2. **Preserve strict alphabetical ordering**: Almost all major lists (especially `free-programming-books`) enforce strict alphabetical ordering by title.
3. **Follow the exact formatting**: Check whether the list uses `-` or `*`, trailing periods, or license badges.
4. **One entry per PR**: Do not bundle multiple changes into one PR.

---

## 1. FreeMediaHeckYeah (FMHY)

- **Target Category**: Educational → [Algorithms & Data Structures](https://fmhy.net/educational#algorithms-data-structures) (listed alongside Visualgo and Algorithm Visualizer) or [Programming Lessons](https://fmhy.net/educational#programming-lessons).
- **Repo**: [`fmhy/edit`](https://github.com/fmhy/edit) (File: `Educational.md`)
- **Website**: [fmhy.net](https://fmhy.net)

### Method A: FMHY Discord (Fastest Review)
1. Join the [FMHY Discord](https://discord.gg/fmhy).
2. Go to the `#suggestions` channel.
3. Post:
   ```text
   Resource: Learn Blazingly Fast
   URL: https://learnblazinglyfast.tech/
   Source Code: https://github.com/EmmanuelEkundayo/Learn-Blazingly-Fast
   Category: Educational / Algorithms & Data Structures
   Description: Free, open-source visual learning platform with 550+ interactive simulations, canvas animations, and exercises for DSA, Machine Learning, System Design, and Frontend concepts. No paywall, no ads, cookie-free open analytics.
   ```

### Method B: GitHub Pull Request
1. Fork [`fmhy/edit`](https://github.com/fmhy/edit).
2. Edit `Educational.md` under `### Algorithms & Data Structures`.
3. Add:
   ```markdown
   * [Learn Blazingly Fast](https://learnblazinglyfast.tech/) - Free, open-source interactive platform with visual step-by-step simulations and quizzes for 550+ CS, DSA, and ML topics.
   ```

---

## 2. Free Programming Books (`EbookFoundation/free-programming-books`) — ⭐ 340k+

- **Repo**: [`EbookFoundation/free-programming-books`](https://github.com/EbookFoundation/free-programming-books)
- **Target File**: `docs/free-programming-interactive-tutorials-en.md`
- **Target Section**: `### Algorithms & Data Structures` or `### Computer Science`
- **Rules**: Must follow alphabetical order and match linting schema.

### Exact Markdown Entry:
```markdown
* [Learn Blazingly Fast](https://learnblazinglyfast.tech/) - Interactive visual simulations and exercises for DSA, Machine Learning, and System Design concepts.
```

### PR Details:
- **Title**: `Add Learn Blazingly Fast to interactive tutorials`
- **Description**:
  ```markdown
  ### Summary
  Adds Learn Blazingly Fast to the interactive tutorials list under Algorithms & Data Structures.

  - **URL**: https://learnblazinglyfast.tech/
  - **Type**: Free interactive tutorials and visual simulations
  - **License / Access**: 100% free open-source (MIT), no paywall, no registration required.
  ```

---

## 3. Awesome Algorithms (`tayllan/awesome-algorithms`) — ⭐ 17k+

- **Repo**: [`tayllan/awesome-algorithms`](https://github.com/tayllan/awesome-algorithms)
- **Target File**: `README.md`
- **Target Section**: `## Websites` or `## Visualizers`

### Exact Markdown Entry:
```markdown
* [Learn Blazingly Fast](https://learnblazinglyfast.tech) - Interactive, step-by-step visual algorithm and data structure simulations with quizzes and roadmaps.
```

---

## 4. Awesome Computer Science (`ayush-raj-13/awesome-computer-science`)

- **Repo**: [`ayush-raj-13/awesome-computer-science`](https://github.com/ayush-raj-13/awesome-computer-science)
- **Target File**: `README.md`
- **Target Section**: `Interactive Learning` / `Online Practice`

### Exact Markdown Entry:
```markdown
* [Learn Blazingly Fast](https://learnblazinglyfast.tech) - Visual learning platform covering 550+ computer science topics across algorithms, architecture, machine learning, and web development.
```

---

## 5. Awesome Self-Hosted (`awesome-selfhosted/awesome-selfhosted`) — ⭐ 220k+

*(Requires container/deployment capability)*
- **Target Category**: `Software Development - Learning & Practice`
- **Repo**: [`awesome-selfhosted/awesome-selfhosted`](https://github.com/awesome-selfhosted/awesome-selfhosted)
- **Status**: Self-hostable via static build / Docker container (`npm run build`).

---

## 6. Hacker News & Reddit (Direct Launch)

- **Show HN**:
  - **Title**: `Show HN: Learn Blazingly Fast – 550+ interactive CS, DSA, and ML visualizers`
  - **Link**: `https://learnblazinglyfast.tech`
  - **Text Comment**: Share the open-source philosophy, why you built 550+ interactive step simulations, and link to GitHub + open analytics.
- **Subreddits**:
  - `r/learnprogramming`: Post as a free resource showcase.
  - `r/computerscience`: Highlight the interactive architecture and graph/tree simulations.
  - `r/reactjs`: Highlight the React 19 + Canvas + Monaco interactive engine.
  - `r/FREEMEDIAHECKYEAH`: Share in the monthly suggestions and feedback thread.
