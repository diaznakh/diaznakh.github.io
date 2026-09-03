const tracker = document.querySelector("#linkedin-posts");

function isSafeLinkedInPost(post) {
  if (!post || typeof post !== "object" || typeof post.url !== "string") return false;
  try {
    if (new URL(post.url).protocol !== "https:") return false;
  } catch { return false; }
  return typeof post.title === "string" && typeof post.date === "string" &&
    typeof post.displayDate === "string" && typeof post.type === "string" &&
    Array.isArray(post.topics) && post.topics.every((topic) => typeof topic === "string");
}

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
    .then((data) => {
      if (!Array.isArray(data)) throw new Error("Invalid LinkedIn post data");
      const posts = data.filter(isSafeLinkedInPost);
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
      const message = document.createElement("div");
      message.className = "tracker-message";
      message.textContent = "Posts could not be loaded.";
      tracker.replaceChildren(message);
    });
}




const nowCard = document.querySelector("[data-currently-building]");

function isSafeCurrentlyBuilding(data) {
  if (!data || typeof data !== "object") return false;
  if (![data.title, data.status, data.summary, data.next, data.updated, data.updatedISO, data.href].every((value) => typeof value === "string")) return false;
  if (!Array.isArray(data.completed) || !data.completed.length || data.completed.some((item) => typeof item !== "string")) return false;
  try {
    const url = new URL(data.href, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

if (nowCard) {
  fetch("data/currently-building.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Could not load current project");
      return response.json();
    })
    .then((data) => {
      if (!isSafeCurrentlyBuilding(data)) throw new Error("Invalid current project data");
      nowCard.querySelector("[data-now-status]").textContent = data.status;
      nowCard.querySelector("[data-now-title]").textContent = data.title;
      nowCard.querySelector("[data-now-summary]").textContent = data.summary;
      const time = nowCard.querySelector("[data-now-updated]");
      time.dateTime = data.updatedISO;
      time.textContent = "Updated " + data.updated;
      const list = nowCard.querySelector("[data-now-list]");
      list.replaceChildren(...data.completed.map((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        return li;
      }));
      nowCard.querySelector("[data-now-next]").textContent = data.next;
      nowCard.querySelector("[data-now-link]").href = new URL(data.href, window.location.origin).pathname;
    })
    .catch(() => {
      nowCard.dataset.source = "fallback";
    });
}

const orbit = document.querySelector(".hero-orbit");
const orbitLinks = [...document.querySelectorAll(".hero-orbit .moving-link")];
const particleCanvas = document.querySelector(".orbit-particles");
const ORBIT_SPEED = 38;
const MOBILE_ORBIT_SPEED = 24;
const EDGE_GAP = 12;
const COLLISION_GAP = 3;
const MAX_ORBIT_PARTICLES = 24;
const PARTICLES_PER_CLICK = 4;

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
  const reducedOrbitMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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
  let arena = null;
  let previousTime = performance.now();
  let orbitFrame = 0;
  let orbitVisible = true;
  let pageVisible = !document.hidden;
  let particles = [];
  let particleContext = null;
  const ORBIT_FRAME_INTERVAL = 1000 / 45;

  function resizeParticleCanvas() {
    if (!particleCanvas || !arena || arena.mobile) {
      particles = [];
      return;
    }
    if (!particleContext) {
      particleContext = particleCanvas.getContext("2d", { alpha: true });
      if (!particleContext) return;
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(arena.width * ratio));
    const height = Math.max(1, Math.round(arena.height * ratio));
    if (particleCanvas.width !== width || particleCanvas.height !== height) {
      particleCanvas.width = width;
      particleCanvas.height = height;
      particleContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = [];
    }
  }

  function keepParticleInOrbit(particle, restitution = 0.82) {
    if (!arena) return;
    const centerX = arena.width / 2;
    const centerY = arena.height / 2;
    const limit = Math.min(arena.width, arena.height) / 2 - particle.radius - 2;
    const dx = particle.x - centerX;
    const dy = particle.y - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance <= limit) return;
    const nx = dx / (distance || 1);
    const ny = dy / (distance || 1);
    particle.x = centerX + nx * limit;
    particle.y = centerY + ny * limit;
    const outwardSpeed = particle.vx * nx + particle.vy * ny;
    if (outwardSpeed > 0) {
      particle.vx -= (1 + restitution) * outwardSpeed * nx;
      particle.vy -= (1 + restitution) * outwardSpeed * ny;
    }
  }

  function resolveParticleBodyCollision(particle, body) {
    const dx = particle.x - body.x;
    const dy = particle.y - body.y;
    const distance = Math.hypot(dx, dy) || 0.001;
    const minimum = particle.radius + body.radius + 1;
    if (distance >= minimum) return;
    const nx = dx / distance;
    const ny = dy / distance;
    particle.x = body.x + nx * minimum;
    particle.y = body.y + ny * minimum;
    let relativeX = particle.vx - body.vx;
    let relativeY = particle.vy - body.vy;
    const impactSpeed = relativeX * nx + relativeY * ny;
    if (impactSpeed < 0) {
      relativeX -= 1.9 * impactSpeed * nx;
      relativeY -= 1.9 * impactSpeed * ny;
      particle.vx = relativeX + body.vx;
      particle.vy = relativeY + body.vy;
    }
  }

  function resolveParticlePair(first, second) {
    let dx = second.x - first.x;
    let dy = second.y - first.y;
    let distance = Math.hypot(dx, dy);
    const minimum = first.radius + second.radius;
    if (distance >= minimum) return;
    if (!distance) {
      dx = 0.001;
      dy = 0;
      distance = 0.001;
    }
    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = minimum - distance;
    const firstMass = first.radius * first.radius;
    const secondMass = second.radius * second.radius;
    const totalMass = firstMass + secondMass;
    first.x -= nx * overlap * (secondMass / totalMass);
    first.y -= ny * overlap * (secondMass / totalMass);
    second.x += nx * overlap * (firstMass / totalMass);
    second.y += ny * overlap * (firstMass / totalMass);

    const relativeSpeed = (second.vx - first.vx) * nx + (second.vy - first.vy) * ny;
    if (relativeSpeed >= 0) return;
    const impulse = -(1.86 * relativeSpeed) / (1 / firstMass + 1 / secondMass);
    first.vx -= (impulse / firstMass) * nx;
    first.vy -= (impulse / firstMass) * ny;
    second.vx += (impulse / secondMass) * nx;
    second.vy += (impulse / secondMass) * ny;
  }

  function updateParticles(delta, time) {
    if (!particles.length || !arena || arena.mobile) return;
    const step = Math.min(delta, 0.04);
    particles = particles.filter((particle) => time - particle.createdAt < particle.lifetime);
    particles.forEach((particle) => {
      particle.vy += 165 * step;
      particle.vx *= 0.999;
      particle.vy *= 0.999;
      const speed = Math.hypot(particle.vx, particle.vy);
      if (speed > 520) {
        particle.vx = (particle.vx / speed) * 520;
        particle.vy = (particle.vy / speed) * 520;
      }
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      keepParticleInOrbit(particle);
      bodies.forEach((body) => resolveParticleBodyCollision(particle, body));
      keepParticleInOrbit(particle);
    });
    for (let first = 0; first < particles.length; first += 1) {
      for (let second = first + 1; second < particles.length; second += 1) {
        resolveParticlePair(particles[first], particles[second]);
      }
    }
    particles.forEach((particle) => keepParticleInOrbit(particle));
  }

  function renderParticles(time = performance.now()) {
    if (!particleContext || !arena || arena.mobile) return;
    particleContext.clearRect(0, 0, arena.width, arena.height);
    particles.forEach((particle) => {
      const remaining = particle.lifetime - (time - particle.createdAt);
      const opacity = Math.max(0, Math.min(0.88, remaining / 2200));
      particleContext.beginPath();
      particleContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      particleContext.fillStyle = `rgba(241, 240, 233, ${opacity})`;
      particleContext.fill();
    });
  }

  function spawnOrbitParticles(event) {
    if (!particleCanvas || !arena || arena.mobile || reducedOrbitMotion.matches) return;
    resizeParticleCanvas();
    if (!particleContext) return;
    const rect = particleCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const originX = ((event.clientX - rect.left) / rect.width) * arena.width;
    const originY = ((event.clientY - rect.top) / rect.height) * arena.height;
    const centerX = arena.width / 2;
    const centerY = arena.height / 2;
    if (Math.hypot(originX - centerX, originY - centerY) > Math.min(arena.width, arena.height) / 2 - 8) return;

    const now = performance.now();
    for (let index = 0; index < PARTICLES_PER_CLICK; index += 1) {
      const radius = 2.5 + Math.random() * 2.5;
      const particle = {
        x: originX + (Math.random() - 0.5) * 18,
        y: originY + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 70,
        vy: 10 + Math.random() * 42,
        radius,
        createdAt: now,
        lifetime: 9000 + Math.random() * 3500
      };
      keepParticleInOrbit(particle, 0);
      particles.push(particle);
    }
    if (particles.length > MAX_ORBIT_PARTICLES) {
      particles.splice(0, particles.length - MAX_ORBIT_PARTICLES);
    }
    startOrbit();
  }

  particleCanvas?.addEventListener("pointerdown", spawnOrbitParticles);

  function collectTextObstacles(orbitRect) {
    if (!isMobileOrbit()) return [];
    const heading = orbit.parentElement?.querySelector("h1");
    if (!heading) return [];
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
    if (!arena) {
      return { minX: body.radius, maxX: body.radius, minY: body.radius, maxY: body.radius, size: body.radius * 2 };
    }
    if (arena.mobile) {
      const minY = arena.contentTop + body.radius;
      const maxY = arena.contentBottom - body.radius;
      return {
        minX: body.radius + EDGE_GAP,
        maxX: arena.width - body.radius - EDGE_GAP,
        minY,
        maxY: Math.max(minY + 1, maxY),
        size: arena.width
      };
    }

    return {
      minX: Math.max(body.radius + EDGE_GAP, -arena.left + body.radius + EDGE_GAP),
      maxX: Math.min(arena.width - body.radius - EDGE_GAP, arena.viewportWidth - arena.left - body.radius - EDGE_GAP),
      minY: body.radius + EDGE_GAP,
      maxY: arena.height - body.radius - EDGE_GAP,
      size: arena.width
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
    const orbitRect = orbit.getBoundingClientRect();
    const mobile = isMobileOrbit();
    const kicker = mobile ? orbit.parentElement?.querySelector(".hero-kicker")?.getBoundingClientRect() : null;
    const footer = mobile ? orbit.parentElement?.querySelector(".hero-footer")?.getBoundingClientRect() : null;
    const size = orbitRect.width;
    if (!size) {
      bodies = null;
      arena = null;
      return;
    }

    arena = {
      mobile,
      width: orbitRect.width,
      height: orbitRect.height,
      left: orbitRect.left,
      viewportWidth: window.innerWidth,
      contentTop: kicker ? kicker.bottom - orbitRect.top + 14 : EDGE_GAP,
      contentBottom: footer ? footer.top - orbitRect.top - 18 : orbitRect.height - EDGE_GAP
    };
    if (particleContext) resizeParticleCanvas();
    const radii = orbitLinks.map((link) => link.offsetWidth / 2);
    obstacles = collectTextObstacles(orbitRect);

    if (mobile) {
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
    orbitFrame = 0;
    if (!bodies || !orbitVisible || !pageVisible) return;
    if (time - previousTime < ORBIT_FRAME_INTERVAL) {
      orbitFrame = requestAnimationFrame(animateOrbit);
      return;
    }

    const delta = Math.min((time - previousTime) / 1000, 1);
    previousTime = time;
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
    updateParticles(delta, time);
    renderParticles(time);
    orbitFrame = requestAnimationFrame(animateOrbit);
  }

  function stopOrbit() {
    if (!orbitFrame) return;
    cancelAnimationFrame(orbitFrame);
    orbitFrame = 0;
  }
  function startOrbit() {
    if (reducedOrbitMotion.matches || orbitFrame || !orbitVisible || !pageVisible) return;
    previousTime = performance.now();
    orbitFrame = requestAnimationFrame(animateOrbit);
  }

  initializeOrbit();
  const orbitResizeObserver = new ResizeObserver(initializeOrbit);
  orbitResizeObserver.observe(orbit);

  const orbitVisibilityObserver = new IntersectionObserver(([entry]) => {
    orbitVisible = entry.isIntersecting;
    if (orbitVisible) startOrbit();
    else stopOrbit();
  });
  orbitVisibilityObserver.observe(orbit);

  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden;
    if (pageVisible) startOrbit();
    else stopOrbit();
  });
  reducedOrbitMotion.addEventListener?.("change", () => {
    if (reducedOrbitMotion.matches) {
      particles = [];
      renderParticles();
      stopOrbit();
    } else {
      startOrbit();
    }
  });
  startOrbit();
}


// Portfolio motion effects: one-time reveals and desktop writing-card spotlight.
(() => {
  const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
  if(reducedMotion.matches)return;

  const revealTargets=Array.from(document.querySelectorAll("[data-reveal]"));
  document.documentElement.classList.add("motion-ready");
  revealTargets.forEach(element=>element.style.setProperty("--reveal-delay",(element.dataset.revealDelay||0)+"ms"));

  if("IntersectionObserver" in window){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        entry.target.classList.toggle("is-visible",entry.isIntersecting);
      });
    },{threshold:.12,rootMargin:"0px 0px -10%"});
    revealTargets.forEach(element=>observer.observe(element));
  }else{
    revealTargets.forEach(element=>element.classList.add("is-visible"));
  }

  if(!window.matchMedia("(hover: hover) and (pointer: fine)").matches)return;
  document.querySelectorAll("[data-spotlight]").forEach(card=>{
    let pendingFrame=0,pointerX=0,pointerY=0;
    card.addEventListener("pointermove",event=>{
      pointerX=event.clientX;
      pointerY=event.clientY;
      if(pendingFrame)return;
      pendingFrame=requestAnimationFrame(()=>{
        const bounds=card.getBoundingClientRect();
        card.style.setProperty("--spot-x",(pointerX-bounds.left)+"px");
        card.style.setProperty("--spot-y",(pointerY-bounds.top)+"px");
        pendingFrame=0;
      });
    });
    card.addEventListener("pointerenter",()=>card.classList.add("spotlight-active"));
    card.addEventListener("pointerleave",()=>{
      card.classList.remove("spotlight-active");
      if(pendingFrame){cancelAnimationFrame(pendingFrame);pendingFrame=0;}
    });
  });
})();

// Horizontal blog carousel: one article per view with buttons, swipe, and keyboard support.
(() => {
  const root=document.querySelector("[data-blog-carousel]");
  if(!root)return;
  const list=root.querySelector(".blog-list");
  const cards=Array.from(list?.querySelectorAll(".featured-post")||[]);
  const previous=root.querySelector("[data-blog-prev]");
  const next=root.querySelector("[data-blog-next]");
  const count=root.querySelector("[data-blog-count]");
  if(!list||!previous||!next||!count||!cards.length)return;

  let active=0,scrollFrame=0;
  const format=value=>String(value).padStart(2,"0");
  const update=()=>{
    count.textContent=format(active+1)+" / "+format(cards.length);
    previous.disabled=active===0;
    next.disabled=active===cards.length-1;
  };
  const goTo=(index,smooth=true)=>{
    active=Math.max(0,Math.min(cards.length-1,index));
    list.scrollTo({left:active*list.clientWidth,behavior:smooth&&!matchMedia("(prefers-reduced-motion: reduce)").matches?"smooth":"auto"});
    update();
  };

  previous.addEventListener("click",()=>goTo(active-1));
  next.addEventListener("click",()=>goTo(active+1));
  list.addEventListener("keydown",event=>{
    if(event.key==="ArrowLeft"){event.preventDefault();goTo(active-1);}
    if(event.key==="ArrowRight"){event.preventDefault();goTo(active+1);}
  });
  list.addEventListener("scroll",()=>{
    if(scrollFrame)return;
    scrollFrame=requestAnimationFrame(()=>{
      const width=Math.max(1,list.clientWidth);
      active=Math.max(0,Math.min(cards.length-1,Math.round(list.scrollLeft/width)));
      update();
      scrollFrame=0;
    });
  },{passive:true});
  window.addEventListener("resize",()=>goTo(active,false),{passive:true});
  update();
})();
