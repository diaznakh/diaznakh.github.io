const tracker = document.querySelector("#linkedin-posts");

function createPost(post, index) {
  const link = document.createElement("a");
  link.className = "linkedin-post";
  link.href = post.url;
  link.target = "_blank";
  link.rel = "noreferrer";

  const meta = document.createElement("div");
  const type = document.createElement("span");
  type.textContent = `${String(index + 1).padStart(2, "0")} · ${post.type}`;
  const date = document.createElement("time");
  date.dateTime = post.date;
  date.textContent = post.displayDate;
  meta.append(type, date);

  const title = document.createElement("h4");
  title.textContent = post.title;
  const topics = document.createElement("p");
  topics.textContent = post.topics.join(" · ");
  const arrow = document.createElement("b");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";

  link.append(meta, title, topics, arrow);
  return link;
}

if (tracker) {
  fetch("data/linkedin-posts.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Could not load LinkedIn posts");
      return response.json();
    })
    .then((posts) => {
      tracker.replaceChildren();
      posts
        .sort((a, b) => b.date.localeCompare(a.date))
        .forEach((post, index) => tracker.append(createPost(post, index)));

      if (!posts.length) {
        const empty = document.createElement("div");
        empty.className = "tracker-message";
        empty.textContent = "No LinkedIn posts added yet.";
        tracker.append(empty);
      }
    })
    .catch(() => {
      tracker.innerHTML = '<div class="tracker-message">Posts could not be loaded.</div>';
    });
}
