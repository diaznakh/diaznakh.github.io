(() => {
  const bar = document.querySelector("[data-reading-progress]");
  if (!bar) return;

  let frame = 0;
  const update = () => {
    const root = document.documentElement;
    const distance = Math.max(1, root.scrollHeight - root.clientHeight);
    const progress = Math.max(0, Math.min(1, root.scrollTop / distance));
    bar.style.transform = `scaleX(${progress})`;
    frame = 0;
  };

  addEventListener("scroll", () => {
    if (!frame) frame = requestAnimationFrame(update);
  }, { passive: true });
  addEventListener("resize", update, { passive: true });
  update();
})();
