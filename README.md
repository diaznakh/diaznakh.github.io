# Zaid Khan — Portfolio

Static engineering portfolio deployed through GitHub Pages.

## Content

- `index.html` — landing page and project overview
- `projects/` — detailed engineering case studies
- `blog/` — individual technical articles
- `writing/` — complete writing archive
- `data/linkedin-posts.json` — manually maintained LinkedIn tracker
- `data/currently-building.json` — source for the homepage “Currently Building” card

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
