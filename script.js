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



const terminalForm = document.querySelector("#terminal-form");
const terminalInput = document.querySelector("#terminal-input");
const terminalOutput = document.querySelector("#terminal-output");
const terminalStorageKey = "zaid-redis-sandbox-v1";
let terminalStore = { "maze:last": "19,8|18,26,10,12,..." };

try {
  const savedTerminalStore = localStorage.getItem(terminalStorageKey);
  if (savedTerminalStore) terminalStore = JSON.parse(savedTerminalStore);
} catch {}

function saveTerminalStore() {
  try { localStorage.setItem(terminalStorageKey, JSON.stringify(terminalStore)); } catch {}
}

function terminalTokens(value) {
  return [...value.matchAll(/"([^"]*)"|'([^']*)'|([^\s]+)/g)].map((match) => match[1] ?? match[2] ?? match[3]);
}

function addTerminalLine(kind, value) {
  const line = document.createElement("p");
  line.className = "terminal-line " + kind;
  line.textContent = value;
  terminalOutput.append(line);
  terminalOutput.scrollTo({ top: terminalOutput.scrollHeight, behavior: "smooth" });
}

if (terminalForm && terminalInput && terminalOutput) {
  terminalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const raw = terminalInput.value.trim();
    terminalInput.value = "";
    const parts = terminalTokens(raw);
    const command = (parts.shift() || "").toUpperCase();
    if (!command) return;

    let response = "(error) unknown command — type HELP";
    if (command === "HELP") response = "PING · SET key value · GET key · DEL key [key...] · EXISTS key · KEYS · RESET · CLEAR";
    else if (command === "PING") response = "PONG";
    else if (command === "SET") {
      const key = parts.shift();
      if (!key || !parts.length) response = "(error) usage: SET key value";
      else { terminalStore[key] = parts.join(" "); saveTerminalStore(); response = "OK"; }
    } else if (command === "GET") response = parts[0] ? (terminalStore[parts[0]] ?? "(nil)") : "(error) usage: GET key";
    else if (command === "DEL") {
      if (!parts.length) response = "(error) usage: DEL key [key...]";
      else {
        let removed = 0;
        parts.forEach((key) => { if (key in terminalStore) { delete terminalStore[key]; removed += 1; } });
        saveTerminalStore();
        response = String(removed);
      }
    } else if (command === "EXISTS") response = parts[0] ? (parts[0] in terminalStore ? "1" : "0") : "(error) usage: EXISTS key";
    else if (command === "KEYS") response = Object.keys(terminalStore).sort().join("\n") || "(empty list)";
    else if (command === "RESET") { terminalStore = { "maze:last": "19,8|18,26,10,12,..." }; saveTerminalStore(); response = "OK — sample dataset restored"; }
    else if (command === "CLEAR") { terminalOutput.replaceChildren(); return; }

    addTerminalLine("command", "> " + raw);
    addTerminalLine("response", response);
  });
}

const orbit = document.querySelector(".hero-orbit");
const orbitLinks = [...document.querySelectorAll(".hero-orbit .moving-link")];
const ORBIT_SPEED = 38;
const MOBILE_ORBIT_SPEED = 24;
const EDGE_GAP = 12;
const COLLISION_GAP = 3;

function isMobileOrbit() {
  return window.innerWidth <= 560;
}

function isTouchNavigation() {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function activeOrbitSpeed() {
  return isMobileOrbit() ? MOBILE_ORBIT_SPEED : ORBIT_SPEED;
}

function keepOrbitSpeed(body) {
  const magnitude = Math.hypot(body.vx, body.vy) || 1;
  const speed = activeOrbitSpeed();
  body.vx = (body.vx / magnitude) * speed;
  body.vy = (body.vy / magnitude) * speed;
}

if (orbit && orbitLinks.length === 2) {
  orbitLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (!isTouchNavigation()) return;
      event.preventDefault();
      const selector = link.getAttribute("href");
      const target = selector ? document.querySelector(selector) : null;
      link.blur();
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  let bodies = null;
  let obstacles = [];
  let previousTime = performance.now();

  function collectTextObstacles() {
    if (!isMobileOrbit()) return [];
    const heading = orbit.parentElement?.querySelector("h1");
    if (!heading) return [];
    const orbitRect = orbit.getBoundingClientRect();
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const rects = [];
    let node = walker.nextNode();

    while (node) {
      if (node.textContent?.trim()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        [...range.getClientRects()].forEach((rect) => {
          if (rect.width > 1 && rect.height > 1) {
            rects.push({
              left: rect.left - orbitRect.left - 3,
              right: rect.right - orbitRect.left + 3,
              top: rect.top - orbitRect.top - 3,
              bottom: rect.bottom - orbitRect.top + 3
            });
          }
        });
      }
      node = walker.nextNode();
    }
    return rects;
  }

  function bodyBounds(body) {
    const rect = orbit.getBoundingClientRect();
    if (isMobileOrbit()) {
      const kicker = orbit.parentElement?.querySelector(".hero-kicker")?.getBoundingClientRect();
      const footer = orbit.parentElement?.querySelector(".hero-footer")?.getBoundingClientRect();
      const minY = (kicker ? kicker.bottom - rect.top + 14 : EDGE_GAP) + body.radius;
      const maxY = (footer ? footer.top - rect.top - 18 : rect.height - EDGE_GAP) - body.radius;
      return {
        minX: body.radius + EDGE_GAP,
        maxX: rect.width - body.radius - EDGE_GAP,
        minY,
        maxY: Math.max(minY + 1, maxY),
        size: rect.width
      };
    }

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
    if (!isMobileOrbit()) {
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

  function resolveTextCollisions(body) {
    obstacles.forEach((rect) => {
      const nearestX = Math.max(rect.left, Math.min(body.x, rect.right));
      const nearestY = Math.max(rect.top, Math.min(body.y, rect.bottom));
      let dx = body.x - nearestX;
      let dy = body.y - nearestY;
      let distance = Math.hypot(dx, dy);
      let nx = 0;
      let ny = 0;

      if (distance === 0) {
        const edges = [
          { distance: Math.abs(body.x - rect.left), nx: -1, ny: 0 },
          { distance: Math.abs(rect.right - body.x), nx: 1, ny: 0 },
          { distance: Math.abs(body.y - rect.top), nx: 0, ny: -1 },
          { distance: Math.abs(rect.bottom - body.y), nx: 0, ny: 1 }
        ].sort((a, b) => a.distance - b.distance);
        nx = edges[0].nx;
        ny = edges[0].ny;
        distance = -edges[0].distance;
      } else {
        nx = dx / distance;
        ny = dy / distance;
      }

      if (distance < body.radius) {
        const correction = body.radius - distance + 1;
        body.x += nx * correction;
        body.y += ny * correction;
        const impactSpeed = body.vx * nx + body.vy * ny;
        if (impactSpeed < 0) {
          body.vx -= 2 * impactSpeed * nx;
          body.vy -= 2 * impactSpeed * ny;
        }
        keepOrbitSpeed(body);
      }
    });
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
    obstacles = collectTextObstacles();

    if (isMobileOrbit()) {
      const speed = activeOrbitSpeed();
      const makeBody = (radius, other) => {
        const shell = { x: size / 2, y: size / 2, vx: 0, vy: 0, radius };
        const limit = bodyBounds(shell);
        let x = limit.maxX;
        let y = limit.minY;

        for (let attempt = 0; attempt < 240; attempt += 1) {
          const candidateX = limit.minX + Math.random() * (limit.maxX - limit.minX);
          const candidateY = limit.minY + Math.random() * (limit.maxY - limit.minY);
          const clearsText = obstacles.every((rect) => {
            const nearestX = Math.max(rect.left, Math.min(candidateX, rect.right));
            const nearestY = Math.max(rect.top, Math.min(candidateY, rect.bottom));
            return Math.hypot(candidateX - nearestX, candidateY - nearestY) >= radius + 4;
          });
          const clearsOther = !other || Math.hypot(candidateX - other.x, candidateY - other.y) >= radius + other.radius + COLLISION_GAP;
          if (clearsText && clearsOther) {
            x = candidateX;
            y = candidateY;
            break;
          }
        }

        const angle = Math.random() * Math.PI * 2;
        return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius };
      };

      const first = makeBody(radii[0]);
      bodies = [first, makeBody(radii[1], first)];
      bodies.forEach((body) => {
        resolveTextCollisions(body);
        constrainBody(body);
      });
      renderOrbit();
      return;
    }

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
      bodies.forEach((body) => {
        if (isMobileOrbit()) resolveTextCollisions(body);
        constrainBody(body);
      });
      resolveOrbitCollision(bodies[0], bodies[1]);
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


// Interactive A* vs Dijkstra maze comparison
(() => {
  const canvases = [document.querySelector("#maze-dijkstra"), document.querySelector("#maze-astar")];
  const stats = [document.querySelector("#maze-dijkstra-stat"), document.querySelector("#maze-astar-stat")];
  const generateButton = document.querySelector("#maze-generate");
  const runButton = document.querySelector("#maze-run");
  if (canvases.some((canvas) => !canvas) || !generateButton || !runButton) return;

  const COLS = 19, ROWS = 11, N = 1, E = 2, S = 4, W = 8;
  const directions = [
    { dx: 0, dy: -1, bit: N, opposite: S },
    { dx: 1, dy: 0, bit: E, opposite: W },
    { dx: 0, dy: 1, bit: S, opposite: N },
    { dx: -1, dy: 0, bit: W, opposite: E }
  ];
  let walls, solutions, timer = null;

  const indexOf = (x, y) => y * COLS + x;
  const pointOf = (index) => ({ x: index % COLS, y: Math.floor(index / COLS) });

  function makeMaze() {
    walls = new Uint8Array(COLS * ROWS).fill(N | E | S | W);
    const seen = new Uint8Array(walls.length);
    const stack = [0];
    seen[0] = 1;
    while (stack.length) {
      const current = stack[stack.length - 1];
      const { x, y } = pointOf(current);
      const options = directions.filter(({ dx, dy }) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !seen[indexOf(nx, ny)];
      });
      if (!options.length) { stack.pop(); continue; }
      const direction = options[Math.floor(Math.random() * options.length)];
      const next = indexOf(x + direction.dx, y + direction.dy);
      walls[current] &= ~direction.bit;
      walls[next] &= ~direction.opposite;
      seen[next] = 1;
      stack.push(next);
    }
    solutions = [solve(false), solve(true)];
    stopAnimation();
    renderBoth(0, false);
    stats[0].textContent = "Ready";
    stats[1].textContent = "Ready";
  }

  function neighbours(node) {
    const { x, y } = pointOf(node);
    return directions.flatMap(({ dx, dy, bit }) => {
      if (walls[node] & bit) return [];
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS ? [indexOf(nx, ny)] : [];
    });
  }

  function solve(useHeuristic) {
    const start = 0, goal = walls.length - 1;
    const distance = new Float64Array(walls.length).fill(Infinity);
    const previous = new Int32Array(walls.length).fill(-1);
    const closed = new Uint8Array(walls.length);
    const queue = [{ node: start, score: 0 }];
    const explored = [];
    distance[start] = 0;
    while (queue.length) {
      queue.sort((a, b) => a.score - b.score);
      const current = queue.shift().node;
      if (closed[current]) continue;
      closed[current] = 1;
      explored.push(current);
      if (current === goal) break;
      for (const next of neighbours(current)) {
        if (closed[next]) continue;
        const candidate = distance[current] + 1;
        if (candidate < distance[next]) {
          distance[next] = candidate;
          previous[next] = current;
          const p = pointOf(next), g = pointOf(goal);
          const heuristic = useHeuristic ? Math.abs(p.x - g.x) + Math.abs(p.y - g.y) : 0;
          queue.push({ node: next, score: candidate + heuristic });
        }
      }
    }
    const path = [];
    for (let node = goal; node !== -1; node = previous[node]) path.push(node);
    path.reverse();
    return { explored, path };
  }

  function draw(canvas, solution, shown, finished) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width, height = canvas.height;
    const cellW = width / COLS, cellH = height / ROWS;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0b0c0b";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#34402d";
    solution.explored.slice(0, shown).forEach((node) => {
      const { x, y } = pointOf(node);
      ctx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
    });
    if (finished) {
      ctx.fillStyle = "#c9ff4a";
      solution.path.forEach((node) => {
        const { x, y } = pointOf(node);
        ctx.fillRect(x * cellW + cellW * .27, y * cellH + cellH * .27, cellW * .46, cellH * .46);
      });
    }

    ctx.strokeStyle = "rgba(241,240,233,.65)";
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    for (let node = 0; node < walls.length; node += 1) {
      const { x, y } = pointOf(node);
      const left = x * cellW, top = y * cellH, right = left + cellW, bottom = top + cellH;
      if (walls[node] & N) { ctx.moveTo(left, top); ctx.lineTo(right, top); }
      if (walls[node] & W) { ctx.moveTo(left, top); ctx.lineTo(left, bottom); }
      if (y === ROWS - 1 && walls[node] & S) { ctx.moveTo(left, bottom); ctx.lineTo(right, bottom); }
      if (x === COLS - 1 && walls[node] & E) { ctx.moveTo(right, top); ctx.lineTo(right, bottom); }
    }
    ctx.stroke();

    [0, walls.length - 1].forEach((node, index) => {
      const { x, y } = pointOf(node);
      ctx.beginPath();
      ctx.fillStyle = index ? "#f1f0e9" : "#c9ff4a";
      ctx.arc(x * cellW + cellW / 2, y * cellH + cellH / 2, Math.min(cellW, cellH) * .22, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function renderBoth(shown, finished) {
    canvases.forEach((canvas, index) => draw(canvas, solutions[index], shown, finished));
  }

  function stopAnimation() {
    if (timer) cancelAnimationFrame(timer);
    timer = null;
    runButton.disabled = false;
    generateButton.disabled = false;
  }

  function run() {
    stopAnimation();
    runButton.disabled = true;
    generateButton.disabled = true;
    const maxSteps = Math.max(solutions[0].explored.length, solutions[1].explored.length);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      renderBoth(maxSteps, true);
      stats.forEach((stat, index) => stat.textContent = solutions[index].explored.length + " explored · " + (solutions[index].path.length - 1) + " steps");
      stopAnimation();
      return;
    }
    let shown = 0, last = performance.now();
    const frame = (now) => {
      if (now - last > 24) {
        shown += 2;
        last = now;
        renderBoth(shown, shown >= maxSteps);
        stats.forEach((stat, index) => {
          const count = Math.min(shown, solutions[index].explored.length);
          stat.textContent = shown >= maxSteps ? solutions[index].explored.length + " explored · " + (solutions[index].path.length - 1) + " steps" : count + " explored";
        });
      }
      if (shown < maxSteps) timer = requestAnimationFrame(frame);
      else stopAnimation();
    };
    timer = requestAnimationFrame(frame);
  }

  generateButton.addEventListener("click", makeMaze);
  runButton.addEventListener("click", run);
  makeMaze();
})();
