const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  if (entry.name === ".git") return [];
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const files = walk(root);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const read = (file) => fs.readFileSync(file, "utf8");

function localTarget(from, href) {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean || /^(?:https?:|mailto:|tel:|data:)/i.test(clean)) return null;
  const decoded = decodeURIComponent(clean);
  const candidate = decoded.startsWith("/")
    ? path.join(root, decoded)
    : path.resolve(path.dirname(from), decoded);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return path.join(candidate, "index.html");
  return candidate;
}

for (const file of htmlFiles) {
  const source = read(file);
  assert.match(source, /^<!doctype html>/i, `${file} is missing a doctype`);
  assert.match(source, /<html\s+lang="en">/i, `${file} is missing a language`);
  assert.match(source, /<meta\s+name="viewport"/i, `${file} is missing a viewport meta tag`);
  assert.match(source, /<title>[^<]+<\/title>/i, `${file} is missing a title`);
  assert.match(source, /<meta\s+name="description"/i, `${file} is missing a description`);
  assert.ok(!source.includes("\\n"), `${file} contains a visible literal \\n`);

  for (const property of ["og:title", "og:description", "og:image"]) {
    assert.match(source, new RegExp(`<meta\\s+property="${property}"\\s+content="[^"]+"`, "i"), `${file} is missing ${property}`);
  }
  const ogImage = source.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1];
  if (ogImage?.startsWith("https://diaznakh.github.io/")) {
    const ogPath = new URL(ogImage).pathname.replace(/^\//, "");
    assert.ok(fs.existsSync(path.join(root, ogPath)), `${file} references missing OG image ${ogPath}`);
  }

  for (const match of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = localTarget(file, match[1]);
    if (target) assert.ok(fs.existsSync(target), `${path.relative(root, file)} links to missing ${match[1]}`);
  }

  for (const match of source.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi)) {
    assert.match(match[0], /rel="[^"]*noreferrer[^"]*"/i, `${file} has an unsafe target=_blank link`);
  }
}

const styles = read(path.join(root, "styles.css"));
assert.ok(!styles.includes('@import "tailwindcss"'), "Remove the unresolved Tailwind import");

for (const jsonPath of ["data/linkedin-posts.json", "data/currently-building.json"]) {
  JSON.parse(read(path.join(root, jsonPath)));
}
const currentBuild = JSON.parse(read(path.join(root, "data/currently-building.json")));
const currentBuildDate = Date.parse(`${currentBuild.updatedISO}T00:00:00Z`);
assert.ok(Number.isFinite(currentBuildDate), "Currently Building needs a valid updatedISO date");
const currentBuildAgeDays = (Date.now() - currentBuildDate) / 86_400_000;
assert.ok(currentBuildAgeDays >= -1, "Currently Building cannot be dated in the future");
assert.ok(currentBuildAgeDays <= 45, "Currently Building is over 45 days old; update or archive it");
const resume = JSON.parse(read(path.join(root, "data/resume.json")));
const resumeDate = Date.parse(`${resume.updatedISO}T00:00:00Z`);
assert.ok(Number.isFinite(resumeDate), "Resume metadata needs a valid updatedISO date");
const resumeAgeDays = (Date.now() - resumeDate) / 86_400_000;
assert.ok(resumeAgeDays >= -1, "Resume metadata cannot be dated in the future");
assert.ok(resumeAgeDays <= 180, "Resume is over 180 days old; review and upload the current version");
assert.ok(fs.existsSync(path.join(root, resume.href)), `Resume file is missing: ${resume.href}`);
const posts = JSON.parse(read(path.join(root, "data/linkedin-posts.json")));
assert.equal(new Set(posts.map((post) => post.url)).size, posts.length, "LinkedIn tracker contains duplicate URLs");

const rss = read(path.join(root, "rss.xml"));
const guids = [...rss.matchAll(/<guid[^>]*>([^<]+)<\/guid>/g)].map((match) => match[1]);
assert.equal(new Set(guids).size, guids.length, "RSS contains duplicate GUIDs");

const sitemap = read(path.join(root, "sitemap.xml"));
for (const file of htmlFiles.filter((file) => file.includes(`${path.sep}blog${path.sep}`))) {
  const publicPath = path.relative(root, file).split(path.sep).join("/");
  assert.ok(sitemap.includes(`https://diaznakh.github.io/${publicPath}`), `Sitemap is missing ${publicPath}`);
}
assert.ok(sitemap.includes("https://diaznakh.github.io/writing/"), "Sitemap is missing the writing archive");

const budgets = {
  ".js": 45 * 1024,
  ".css": 70 * 1024,
  ".png": 750 * 1024,
  ".webp": 250 * 1024
};
for (const file of files) {
  const limit = budgets[path.extname(file)];
  if (limit) assert.ok(fs.statSync(file).size <= limit, `${path.relative(root, file)} exceeds its size budget`);
}

console.log(`Validated ${htmlFiles.length} HTML pages, ${files.length} files, JSON data, RSS, sitemap, links, and asset budgets.`);
