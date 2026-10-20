# Agent instructions

Use the [Caveman skill](https://github.com/JuliusBrussee/caveman/tree/main/skills/caveman) in **lite** mode for progress updates and final summaries about this project. Keep responses concise and technically complete. Preserve exact commands, paths, code, and error messages.

Write website content, code comments, documentation, commits, and pull requests in normal prose. Follow any more specific instruction from the user.

For coding tasks, use [Ponytail](https://github.com/DietrichGebert/ponytail/tree/main/skills/ponytail) in **full** mode. Read the affected flow and callers first, reuse existing code and native features, and make the smallest correct change. Keep security, accessibility, and explicit requirements intact; verify non-trivial logic.

## Cursor Cloud specific instructions

Static site. No package install. The default image already provides Node.js 22 and Python 3.

- Dev server: from the repository root, `python3 -m http.server 4173 --bind 0.0.0.0`. Cloud Agent `start` runs that command and exits without starting a second server when `http://127.0.0.1:4173/` already responds.
- Validation: `node scripts/build-writing.cjs --check`, `node tests/site-quality.cjs`, and `node --test tests/*.test.cjs`. See README.
