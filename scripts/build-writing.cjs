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
const isExternal = (post) => typeof post.url === "string";
const postKey = (post) => isExternal(post) ? post.url : post.path;

function isLinkedInUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" &&
      (parsed.hostname === "www.linkedin.com" || parsed.hostname === "linkedin.com" || parsed.hostname === "lnkd.in");
  } catch {
    return false;
  }
}

function postHref(post, prefix = "") {
  return isExternal(post) ? post.url : prefix + post.path;
}

function postLinkOpen(post, prefix, label) {
  const extra = isExternal(post) ? ' target="_blank" rel="noreferrer"' : "";
  return `<a href="${escape(postHref(post, prefix))}"${extra} aria-label="${label}">`;
}

function postCta(post) {
  return isExternal(post) ? "Read on LinkedIn" : "Read article";
}

function postDuration(post, long) {
  if (isExternal(post)) return "LinkedIn";
  return long ? post.minutes + " min read" : post.minutes + " min";
}

function validatePosts(posts) {
  if (!Array.isArray(posts)) throw new Error("Blog metadata must be an array");
  const seen = new Set();
  for (const post of posts) {
    if (!post || ![post.title, post.summary, post.category].every((text) => typeof text === "string" && text.trim())) {
      throw new Error("Each blog needs a title, summary, and category");
    }
    const hasPath = typeof post.path === "string";
    const hasUrl = typeof post.url === "string";
    if (hasPath === hasUrl) throw new Error("Each blog needs a path or an external url");
    if (hasPath && !/^blog\/[a-z0-9-]+\.html$/.test(post.path)) throw new Error("Invalid blog path");
    if (hasUrl && !isLinkedInUrl(post.url)) throw new Error("Invalid external url");
    const key = postKey(post);
    if (seen.has(key)) throw new Error("Duplicate blog entry: " + key);
    seen.add(key);
    if (!validDate(post.date) || !validDate(post.updated) || post.updated < post.date) throw new Error("Invalid blog date");
    if (hasPath && (!Number.isInteger(post.minutes) || post.minutes < 1 || post.minutes > 180)) throw new Error("Invalid reading time");
  }
  return [...posts].sort((a, b) => b.date.localeCompare(a.date) || postKey(a).localeCompare(postKey(b)));
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
  const localPosts = posts.filter((post) => !isExternal(post));
  const cards = localPosts.map((post, index) => `          <article class="featured-post${index ? " secondary-post" : ""}" data-reveal data-reveal-delay="${Math.min(index * 65, 130)}" data-spotlight>
            <div class="post-meta"><span>${escape(post.category)}</span><time datetime="${post.date}">${displayDate(post.date)}</time><span>${postDuration(post, true)}</span></div>
            <h3>${escape(post.title)}</h3>
            <p>${escape(post.summary)}</p>
            ${postLinkOpen(post, "", "Read " + escape(post.title))}${postCta(post)} <span aria-hidden="true">↗</span></a>
          </article>`).join("\n");
  const newest = posts[0];
  const featuredDuration = newest && !isExternal(newest) ? `<span>${postDuration(newest, true)}</span>` : "";
  const featured = newest ? `      <article class="featured-post">
        <div class="post-meta"><span>${escape(newest.category)}</span><time datetime="${newest.date}">${displayDate(newest.date)}</time>${featuredDuration}</div>
        <h2>${escape(newest.title)}</h2>
        <p>${escape(newest.summary)}</p>
        ${postLinkOpen(newest, "../", (isExternal(newest) ? "Read " + escape(newest.title) + " on LinkedIn" : "Read " + escape(newest.title)))}${postCta(newest)} <span aria-hidden="true">↗</span></a>
      </article>` : "";
  const archive = posts.map((post) => `      <article>
        <time datetime="${post.date}">${displayDate(post.date)}<br>${postDuration(post, false)}</time>
        <div><h2>${escape(post.title)}</h2><p>${escape(post.summary)}</p></div>
        ${postLinkOpen(post, "../", (isExternal(post) ? "Read " + escape(post.title) + " on LinkedIn" : "Read " + escape(post.title)))}${postCta(post)} ↗</a>
      </article>`).join("\n");
  const items = posts.map((post) => `    <item>
      <title>${escape(post.title)}</title>
      <link>${escape(postHref(post, origin))}</link>
      <guid isPermaLink="true">${escape(postHref(post, origin))}</guid>
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
  const sitemap = localPosts.map((post) => `  <url><loc>${origin}${post.path}</loc><lastmod>${post.updated}</lastmod><priority>0.7</priority></url>`).join("\n");
  return { cards, featured, archive, rss, sitemap };
}

function build(check = false) {
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const posts = validatePosts(JSON.parse(read("data/blog-posts.json")));
  for (const post of posts) {
    if (!isExternal(post) && !fs.existsSync(path.join(root, post.path))) throw new Error("Missing article: " + post.path);
  }
  const rendered = renderWriting(posts);
  const localCount = posts.filter((post) => !isExternal(post)).length;
  let home = replaceRegion(read("index.html"), "blog-cards", rendered.cards);
  home = home.replace(/(<span[^>]*data-blog-count>)[^<]*(<\/span>)/,
    (_, start, end) => start + (localCount ? "01" : "00") + " / " + String(localCount).padStart(2, "0") + end);
  const outputs = {
    "index.html": home,
    "writing/index.html": replaceRegion(
      replaceRegion(read("writing/index.html"), "blog-featured", rendered.featured),
      "blog-archive",
      rendered.archive
    ),
    "rss.xml": rendered.rss,
    "sitemap.xml": replaceRegion(read("sitemap.xml"), "blog-sitemap", rendered.sitemap)
  };
  const changed = Object.entries(outputs).filter(([file, content]) => read(file) !== content);
  if (check && changed.length) throw new Error("Run node scripts/build-writing.cjs; outdated files: " + changed.map(([file]) => file).join(", "));
  if (!check) for (const [file, content] of changed) fs.writeFileSync(path.join(root, file), content);
  console.log(`${posts.length} posts: ${check ? "generated content verified" : changed.length + " files updated"}`);
}

if (require.main === module) build(process.argv.includes("--check"));
module.exports = { validatePosts, renderWriting, replaceRegion };
