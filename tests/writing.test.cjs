const assert = require("node:assert/strict");
const { validatePosts, renderWriting, replaceRegion } = require("../scripts/build-writing.cjs");
const posts = require("../data/blog-posts.json");
const addition = { title: 'CPU <flags> & "state"', summary: "A & B", category: "Systems", path: "blog/cpu-flags.html", date: "2026-09-06", updated: "2026-09-06", minutes: 4 };
const sorted = validatePosts([...posts, addition]);
assert.equal(sorted[0].path, addition.path);
const rendered = renderWriting(sorted);
for (const name of ["cards", "archive", "rss", "sitemap"]) {
  for (const post of sorted) assert.ok(rendered[name].includes(post.path), name + " must include every article");
}
assert.match(rendered.cards, /CPU &lt;flags&gt; &amp; &quot;state&quot;/);
assert.match(rendered.rss, /Sat, 05 Sep 2026 18:30:00 GMT/);
assert.throws(() => validatePosts([...posts, posts[0]]), /Duplicate/);
assert.throws(() => validatePosts([{ ...addition, date: "2026-02-30" }]), /date/);
assert.throws(() => validatePosts([{ ...addition, path: "blog/../../index.html" }]), /path/);
assert.equal(replaceRegion("before<!-- generated:x:start -->old<!-- generated:x:end -->after", "x", "new"), "before<!-- generated:x:start -->\nnew\n<!-- generated:x:end -->after");
assert.throws(() => replaceRegion("no markers", "x", "new"), /region/);
console.log("Writing generation, ordering, escaping, and validation passed.");
