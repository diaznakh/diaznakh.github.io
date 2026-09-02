# Zaid Khan — Portfolio

Static engineering portfolio deployed through GitHub Pages.

## Content

- `index.html` — landing page and project overview
- `projects/` — detailed engineering case studies
- `blog/` — individual technical articles
- `writing/` — complete writing archive
- `data/linkedin-posts.json` — manually maintained LinkedIn tracker
- `data/currently-building.json` — source for the homepage “Currently Building” card
- `data/resume.json` — résumé path and review date used by freshness checks

## Scripts

- `script.js` — homepage UI, data loading, orbit motion, reveals, and carousel
- `maze-redis-demo.js` — page-specific Redis and maze sandbox
- `maze-comparison.js` — A* and Dijkstra article visualizer
- `cpu-demo.js` — bounded 6502 case-study demo
- `article.js` — lightweight article reading progress

## Validation

Run the same checks used by GitHub Actions:

```sh
node tests/site-quality.cjs
node --test tests/*.test.cjs
```

GitHub Actions also checks external links, validates OG images, and runs
Lighthouse against the landing page, 6502 case study, and interactive
Maze/Redis article. The build fails when Currently Building is older than 45
days or the résumé review date is older than 180 days.
