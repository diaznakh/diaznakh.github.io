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


const orbit = document.querySelector(".hero-orbit");
const orbitLinks = [...document.querySelectorAll(".hero-orbit .moving-link")];
const ORBIT_SPEED = 38;
const MOBILE_ORBIT_SPEED = 26;
const EDGE_GAP = 12;
const COLLISION_GAP = 3;

function activeOrbitSpeed() {
  return window.innerWidth <= 560 ? MOBILE_ORBIT_SPEED : ORBIT_SPEED;
}

function keepOrbitSpeed(body) {
  const magnitude = Math.hypot(body.vx, body.vy) || 1;
  const speed = activeOrbitSpeed();
  body.vx = (body.vx / magnitude) * speed;
  body.vy = (body.vy / magnitude) * speed;
}

if (orbit && orbitLinks.length === 2) {
  let bodies = null;
  let previousTime = performance.now();

  function bodyBounds(body) {
    const rect = orbit.getBoundingClientRect();
    return {
      minX: Math.max(body.radius + EDGE_GAP, -rect.left + body.radius + EDGE_GAP),
      maxX: Math.min(rect.width - body.radius - EDGE_GAP, window.innerWidth - rect.left - body.radius - EDGE_GAP),
      minY: body.radius + EDGE_GAP,
      maxY: rect.height - body.radius - EDGE_GAP,
      size: rect.width
    };
  }

  function constrainBody(body) {
    const limit = bodyBounds(body);
    const center = limit.size / 2;
    const maxRadius = center - body.radius - EDGE_GAP;
    const dx = body.x - center;
    const dy = body.y - center;
    const distance = Math.hypot(dx, dy);

    if (distance > maxRadius) {
      const nx = dx / distance;
      const ny = dy / distance;
      body.x = center + nx * maxRadius;
      body.y = center + ny * maxRadius;
      const outwardSpeed = body.vx * nx + body.vy * ny;
      if (outwardSpeed > 0) {
        body.vx -= 2 * outwardSpeed * nx;
        body.vy -= 2 * outwardSpeed * ny;
      }
    }

    if (body.x < limit.minX) {
      body.x = limit.minX;
      body.vx = Math.abs(body.vx);
    } else if (body.x > limit.maxX) {
      body.x = limit.maxX;
      body.vx = -Math.abs(body.vx);
    }

    if (body.y < limit.minY) {
      body.y = limit.minY;
      body.vy = Math.abs(body.vy);
    } else if (body.y > limit.maxY) {
      body.y = limit.maxY;
      body.vy = -Math.abs(body.vy);
    }

    keepOrbitSpeed(body);
  }

  function resolveOrbitCollision(first, second) {
    const dx = second.x - first.x;
    const dy = second.y - first.y;
    const distance = Math.hypot(dx, dy) || 0.001;
    const minimum = first.radius + second.radius + COLLISION_GAP;
    if (distance >= minimum) return;

    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = minimum - distance;
    first.x -= nx * overlap * 0.5;
    first.y -= ny * overlap * 0.5;
    second.x += nx * overlap * 0.5;
    second.y += ny * overlap * 0.5;

    const relativeNormalSpeed = (second.vx - first.vx) * nx + (second.vy - first.vy) * ny;
    if (relativeNormalSpeed < 0) {
      first.vx += relativeNormalSpeed * nx;
      first.vy += relativeNormalSpeed * ny;
      second.vx -= relativeNormalSpeed * nx;
      second.vy -= relativeNormalSpeed * ny;
      keepOrbitSpeed(first);
      keepOrbitSpeed(second);
    }
  }

  function renderOrbit() {
    if (!bodies) return;
    bodies.forEach((body, index) => {
      orbitLinks[index].style.left = `${body.x}px`;
      orbitLinks[index].style.top = `${body.y}px`;
    });
  }

  function initializeOrbit() {
    const size = orbit.getBoundingClientRect().width;
    if (!size) {
      bodies = null;
      return;
    }

    const radii = orbitLinks.map((link) => link.offsetWidth / 2);
    const angle = Math.random() * Math.PI * 2;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const separation = radii[0] + radii[1] + 34;
    const center = size / 2;
    const speed = activeOrbitSpeed();

    bodies = [
      { x: center - nx * separation * 0.5, y: center - ny * separation * 0.5, vx: nx * speed, vy: ny * speed, radius: radii[0] },
      { x: center + nx * separation * 0.5, y: center + ny * separation * 0.5, vx: -nx * speed, vy: -ny * speed, radius: radii[1] }
    ];
    bodies.forEach(constrainBody);
    renderOrbit();
  }

  function animateOrbit(time) {
    if (bodies) {
      const delta = Math.min((time - previousTime) / 1000, 1);
      bodies.forEach((body) => {
        body.x += body.vx * delta;
        body.y += body.vy * delta;
      });
      resolveOrbitCollision(bodies[0], bodies[1]);
      bodies.forEach(constrainBody);
      renderOrbit();
    }
    previousTime = time;
    requestAnimationFrame(animateOrbit);
  }

  initializeOrbit();
  const orbitResizeObserver = new ResizeObserver(initializeOrbit);
  orbitResizeObserver.observe(orbit);

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    requestAnimationFrame(animateOrbit);
  }
}
