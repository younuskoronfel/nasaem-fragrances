(() => {
  const sections = [...document.querySelectorAll("main > section")];
  const header = document.querySelector(".site-header");
  const motion = matchMedia("(prefers-reduced-motion: no-preference)");
  const wheelGap = 240;
  let gesture;
  let previousY = scrollY;

  function sectionCrossed(from, to) {
    const y = scrollY;
    const maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const headerHeight = header.offsetHeight;
    const stops = sections.map(section =>
      Math.max(0, Math.min(maximum, Math.round(section.getBoundingClientRect().top + y - headerHeight)))
    );
    if (to > from) return stops.find(stop => stop > from + 1 && stop <= to + 1);
    return stops.findLast(stop => stop < from - 1 && stop >= to - 1);
  }

  function holdAt(stop) {
    gesture.stop = stop;
    scrollTo({ top: stop, behavior: "instant" });
    previousY = scrollY;
  }

  function canPause(event) {
    return motion.matches && !event.defaultPrevented && !event.ctrlKey &&
      !document.querySelector("dialog[open]") && !event.target.closest?.("select, textarea");
  }

  addEventListener("wheel", event => {
    if (!canPause(event) || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const now = performance.now();
    const direction = Math.sign(event.deltaY);
    if (gesture?.kind !== "wheel" || gesture.direction !== direction || now - gesture.time > wheelGap) {
      gesture = { kind: "wheel", direction };
    }
    gesture.time = now;
    if (!event.cancelable) return;
    if (gesture.stop !== undefined) {
      event.preventDefault();
    } else if (event.deltaMode === 0) {
      const stop = sectionCrossed(scrollY, scrollY + event.deltaY);
      if (stop === undefined) return;
      event.preventDefault();
      holdAt(stop);
    }
  }, { passive: false });

  addEventListener("touchstart", event => {
    gesture = undefined;
    if (event.touches.length !== 1 || !canPause(event)) return;
    const { clientX, clientY } = event.touches[0];
    gesture = { kind: "touch", clientX, clientY, down: true };
  }, { passive: true });

  addEventListener("touchmove", event => {
    if (gesture?.kind !== "touch") return;
    if (event.touches.length !== 1 || !canPause(event)) {
      gesture = undefined;
      return;
    }
    if (gesture.stop !== undefined && event.cancelable) event.preventDefault();
    const touch = event.touches[0];
    const vertical = Math.abs(touch.clientY - gesture.clientY);
    if (vertical > Math.max(5, Math.abs(touch.clientX - gesture.clientX))) gesture.time = performance.now();
  }, { passive: false });

  function endTouch() {
    if (gesture?.kind !== "touch") return;
    gesture.down = false;
    if (gesture.time !== undefined) gesture.time = performance.now();
  }
  addEventListener("touchend", endTouch, { passive: true });
  addEventListener("touchcancel", endTouch, { passive: true });

  addEventListener("scroll", () => {
    const from = previousY;
    const y = previousY = scrollY;
    if (!motion.matches || !gesture?.time || document.querySelector("dialog[open]")) return;
    const now = performance.now();
    const expiry = gesture.kind === "wheel" ? wheelGap : 900;
    if (!gesture.down && now - gesture.time > expiry) return;
    if (gesture.kind === "touch") gesture.time = now;
    if (gesture.stop !== undefined) {
      if (Math.abs(y - gesture.stop) > 1) holdAt(gesture.stop);
      return;
    }
    if (gesture.kind === "wheel" && Math.sign(y - from) !== gesture.direction) return;
    const stop = sectionCrossed(from, y);
    if (stop !== undefined) holdAt(stop);
  }, { passive: true });

  // Explicit navigation and keyboard scrolling can go straight to their destination.
  function release() { gesture = undefined; }
  addEventListener("click", release, { capture: true });
  addEventListener("keydown", release, { capture: true });
  addEventListener("hashchange", release);
  motion.addEventListener("change", release);
})();
