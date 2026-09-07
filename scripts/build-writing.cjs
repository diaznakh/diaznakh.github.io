const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const origin = "https://diaznakh.github.io/";
const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const displayDate = (value) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
}).format(new Date(value));

function validatePosts(posts) {
  if (!Array.isArray(posts)) throw new Error("Blog metadata must be an array");
  const seen = new Set();
  for (const post of posts) {
    if (!post || ![post.title, post.summary, post.category].every((text) => typeof text === "string" && text.trim())) {
      throw new Error("Each blog needs a title, summary, and category");
    }
    if (typeof post.path !== "string" || !/^blog\/[a-z0-9-]+\.html$/.test(post.path)) throw new Error("Invalid blog path");
    if (seen.has(post.path)) throw new Error("Duplicate blog path: " + post.path);
    seen.add(post.path);
    if (!validDate(post.date) || !validDate(post.updated) || post.updated < post.date) throw new Error("Invalid blog date");
    if (!Number.isInteger(post.minutes) || post.minutes < 1 || post.minutes > 180) throw new Error("Invalid reading time");
  }
  return [...posts].sort((a, b) => b.date.localeCompare(a.date) || a.path.localeCompare(b.path));
}

function replaceRegion(source, name, content) {
  const start = `<!-- generated:${name}:start -->`;
  const end = `<!-- generated:${name}:end -->`;
  const first = source.indexOf(start);
  const last = source.indexOf(end);
  if (first < 0 || last < first || source.indexOf(start, first + 1) !== -1) throw new Error("Missing or duplicate region: " + name);
  return source.slice(0, first + start.length) + "\n" + content + "\n" + source.slice(last);
}

function renderWriting(posts) {
  const cards = posts.map((post, index) => `          <article class="featured-post${index ? " secondary-post" : ""}" data-reveal data-reveal-delay="${Math.min(index * 65, 130)}" data-spotlight>
            <div class="post-meta"><span>${escape(post.category)}</span><time datetime="${post.date}">${displayDate(post.date)}</time><span>${post.minutes} min read</span></div>
            <h3>${escape(post.title)}</h3>
            <p>${escape(post.summary)}</p>
            <a href="${post.path}" aria-label="Read ${escape(post.title)}">Read article <span aria-hidden="true">↗</span></a>
          </article>`).join("\n");
  const archive = posts.map((post) => `      <article>
        <time datetime="${post.date}">${displayDate(post.date)}<br>${post.minutes} min</time>
        <div><h2>${escape(post.title)}</h2><p>${escape(post.summary)}</p></div>
        <a href="../${post.path}">Read article ↗</a>
      </article>`).join("\n");
  const items = posts.map((post) => `    <item>
      <title>${escape(post.title)}</title>
      <link>${origin}${post.path}</link>
      <guid isPermaLink="true">${origin}${post.path}</guid>
      <pubDate>${new Date(post.date + "T00:00:00+05:30").toUTCString()}</pubDate>
      <description>${escape(post.summary)}</description>
    </item>`).join("\n");
  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Zaid Khan — Technical Field Notes</title>
    <link>${origin}#writing</link>
    <description>Notes on C++, systems programming, algorithms, networking, and learning by building.</description>
    <language>en</language>
    <atom:link href="${origin}rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  const sitemap = posts.map((post) => `  <url><loc>${origin}${post.path}</loc><lastmod>${post.updated}</lastmod><priority>0.7</priority></url>`).join("\n");
  return { cards, archive, rss, sitemap };
}

function build(check = false) {
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const posts = validatePosts(JSON.parse(read("data/blog-posts.json")));
  for (const post of posts) if (!fs.existsSync(path.join(root, post.path))) throw new Error("Missing article: " + post.path);
  const rendered = renderWriting(posts);
  let home = replaceRegion(read("index.html"), "blog-cards", rendered.cards);
  home = home.replace(/(<span[^>]*data-blog-count>)[^<]*(<\/span>)/,
    (_, start, end) => start + (posts.length ? "01" : "00") + " / " + String(posts.length).padStart(2, "0") + end);
  const outputs = {
    "index.html": home,
    "writing/index.html": replaceRegion(read("writing/index.html"), "blog-archive", rendered.archive),
    "rss.xml": rendered.rss,
    "sitemap.xml": replaceRegion(read("sitemap.xml"), "blog-sitemap", rendered.sitemap)
  };
  const changed = Object.entries(outputs).filter(([file, content]) => read(file) !== content);
  if (check && changed.length) throw new Error("Run node scripts/build-writing.cjs; outdated files: " + changed.map(([file]) => file).join(", "));
  if (!check) for (const [file, content] of changed) fs.writeFileSync(path.join(root, file), content);
  console.log(`${posts.length} blogs: ${check ? "generated content verified" : changed.length + " files updated"}`);
}

if (require.main === module) build(process.argv.includes("--check"));
module.exports = { validatePosts, renderWriting, replaceRegion };
