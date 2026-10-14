(() => {
  const load = () => {
    if (load.done) return;
    load.done = true;
    const script = document.createElement("script");
    script.src = "script.js?v=20261014-late";
    document.body.appendChild(script);
  };
  ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"].forEach((type) => {
    window.addEventListener(type, load, { once: true, passive: true });
  });
  window.addEventListener("load", () => setTimeout(load, 10000));
})();
