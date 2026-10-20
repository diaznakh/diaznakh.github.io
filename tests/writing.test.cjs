const assert = require("node:assert/strict");
const { validatePosts, renderWriting, replaceRegion } = require("../scripts/build-writing.cjs");
const posts = require("../data/blog-posts.json");
const addition = { title: 'CPU <flags> & "state"', summary: "A & B", category: "Systems", path: "blog/cpu-flags.html", date: "2026-09-06", updated: "2026-09-06", minutes: 4 };
const external = {
  title: 'Launch <post> & "notes"',
  summary: "A & B",
  category: "LinkedIn",
  url: "https://www.linkedin.com/posts/example-activity-1",
  date: "2026-11-01",
  updated: "2026-11-01"
};
const sorted = validatePosts([...posts, addition, external]);
assert.equal(sorted[0].url, external.url);
assert.equal(sorted.find((post) => post.path === addition.path).path, addition.path);
const rendered = renderWriting(sorted);
for (const post of sorted.filter((post) => post.path)) {
  for (const name of ["cards", "archive", "rss", "sitemap"]) {
    assert.ok(rendered[name].includes(post.path), name + " must include every local article");
  }
}
assert.ok(!rendered.cards.includes(external.url));
assert.ok(!rendered.sitemap.includes("linkedin.com"));
assert.ok(rendered.archive.includes(external.url));
assert.ok(rendered.rss.includes(external.url));
assert.match(rendered.featured, /Launch &lt;post&gt; &amp; &quot;notes&quot;/);
assert.ok(rendered.featured.includes(external.url));
assert.ok(rendered.featured.includes('target="_blank" rel="noreferrer"'));
assert.match(rendered.featured, /Read on LinkedIn/);
assert.ok(!posts.filter((post) => post.path).some((post) => rendered.featured.includes(post.path)));
assert.match(rendered.cards, /CPU &lt;flags&gt; &amp; &quot;state&quot;/);
assert.match(rendered.rss, /Sat, 05 Sep 2026 18:30:00 GMT/);
assert.throws(() => validatePosts([...posts, posts[0]]), /Duplicate/);
assert.throws(() => validatePosts([{ ...addition, date: "2026-02-30" }]), /date/);
assert.throws(() => validatePosts([{ ...addition, path: "blog/../../index.html" }]), /path/);
assert.throws(() => validatePosts([{ ...addition, url: external.url }]), /path or an external url/);
assert.throws(() => validatePosts([{ ...external, url: "https://example.com/post" }]), /url/);
assert.equal(replaceRegion("before<!-- generated:x:start -->old<!-- generated:x:end -->after", "x", "new"), "before<!-- generated:x:start -->\nnew\n<!-- generated:x:end -->after");
assert.throws(() => replaceRegion("no markers", "x", "new"), /region/);
console.log("Writing generation, ordering, escaping, and validation passed.");
