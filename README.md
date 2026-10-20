# Zaid Khan — Portfolio

Static engineering portfolio deployed through GitHub Pages.

## Content

- `index.html` — landing page and project overview
- `work/` — featured case studies and a dated public-repo archive
- `about/` — timeline, current focus, and education
- `projects/` — detailed engineering case studies
- `blog/` — individual technical articles
- `writing/` — complete writing archive
- `llms.txt` — machine-readable site description and key links
- `data/linkedin-posts.json` — manually maintained LinkedIn tracker
- `data/blog-posts.json` — shared writing metadata (local articles and external LinkedIn posts); run `node scripts/build-writing.cjs` after editing to refresh the homepage carousel, writing featured post and archive, RSS, and sitemap
- `data/currently-building.json` — retained for freshness checks (the homepage Latest section was removed so ResearchComb is not shown twice)
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
node scripts/build-writing.cjs --check
node tests/site-quality.cjs
node --test tests/*.test.cjs
```

GitHub Actions also checks external links, validates OG images, and runs
Lighthouse against the landing page, 6502 case study, and interactive
Maze/Redis article. The build fails when Currently Building is older than 45
days or the résumé review date is older than 180 days.
