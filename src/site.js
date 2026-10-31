(() => {
  "use strict";

  function startJournal() {
    const stops = Array.from(document.querySelectorAll("[data-stop]"));
    if (!stops.length) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const routeLinks = Array.from(document.querySelectorAll("a[data-route-link]"));
    const itinerary = document.querySelector(".itinerary");
    const itineraryLinks = itinerary ? routeLinks.filter((link) => itinerary.contains(link)) : [];
    const placeLabels = Array.from(document.querySelectorAll("[data-current-place]"));
    const positions = Array.from(document.querySelectorAll("[data-current-position]"));
    const previousButtons = Array.from(document.querySelectorAll("[data-route-prev]"));
    const nextButtons = Array.from(document.querySelectorAll("[data-route-next]"));
    const status = document.querySelector("[data-route-status]");
    const roads = Array.from(document.querySelectorAll("[data-road]"), (road) => ({
      road,
      marker: road.querySelector("[data-road-marker]"),
      travel: 0,
    }));
    const byId = new Map(stops.map((stop, index) => [stop.id, index]));
    let current = -1;
    let frame = 0;
    let captionFrame = 0;
    let captionTimer = 0;
    let navigationTarget = null;
    let measureRoads = true;

    function labelAt(index) {
      return stops[index].dataset.stopLabel || stops[index].id;
    }

    function indexForLink(link) {
      const target = new URL(link.href, window.location.href);
      if (target.origin !== window.location.origin || target.pathname !== window.location.pathname || target.search !== window.location.search) return undefined;
      try {
        return byId.get(decodeURIComponent(target.hash.slice(1)));
      } catch {
        return undefined;
      }
    }

    function clearCaptionMotion() {
      cancelAnimationFrame(captionFrame);
      clearTimeout(captionTimer);
      placeLabels.forEach((label) => label.classList.remove("is-changing"));
    }

    function updateCaption(index, animate) {
      clearCaptionMotion();
      placeLabels.forEach((label) => { label.textContent = labelAt(index); });
      if (!animate || reducedMotion.matches) return;
      captionFrame = requestAnimationFrame(() => {
        placeLabels.forEach((label) => label.classList.add("is-changing"));
        captionTimer = window.setTimeout(clearCaptionMotion, 500);
      });
    }

    function paint(index) {
      const changed = index !== current;
      if (changed) {
        updateCaption(index, current !== -1);
        current = index;
        positions.forEach((position) => {
          position.textContent = `${String(index + 1).padStart(2, "0")} / ${stops.length}`;
        });
        routeLinks.forEach((link) => {
          const selected = indexForLink(link) === index;
          link.classList.toggle("is-active", selected);
          if (selected) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
        previousButtons.forEach((button) => { button.disabled = index === 0; });
        nextButtons.forEach((button) => { button.disabled = index === stops.length - 1; });
      }
      if (index === navigationTarget) navigationTarget = null;
      const progress = stops.length > 1 ? index / (stops.length - 1) : 0;
      roads.forEach(({ road, marker, travel }) => {
        road.style.setProperty("--route-progress", String(progress));
        if (marker) marker.style.transform = `translateX(${progress * travel}px)`;
      });
    }

    function itineraryScrollTarget(index) {
      if (!itinerary || !itinerary.clientHeight || itinerary.scrollHeight <= itinerary.clientHeight) return null;
      const link = itineraryLinks.find((item) => indexForLink(item) === index);
      if (!link) return null;
      const bounds = itinerary.getBoundingClientRect();
      const visibleTop = bounds.top + itinerary.clientTop;
      const visibleBottom = visibleTop + itinerary.clientHeight;
      const item = link.getBoundingClientRect();
      if (item.top < visibleTop) return itinerary.scrollTop + item.top - visibleTop;
      if (item.bottom > visibleBottom) return itinerary.scrollTop + item.bottom - visibleBottom;
      return null;
    }

    function updateReadingPosition() {
      frame = 0;
      const scrollPadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const readingLine = Math.max(scrollPadding + 2, Math.min(240, Math.max(112, window.innerHeight * 0.28)));
      let index = 0;
      for (let position = 0; position < stops.length; position += 1) {
        if (stops[position].getBoundingClientRect().top > readingLine) break;
        index = position;
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) index = stops.length - 1;
      if (measureRoads) {
        roads.forEach((item) => {
          item.travel = item.marker ? Math.max(0, item.road.clientWidth - item.marker.getBoundingClientRect().width) : 0;
        });
        measureRoads = false;
      }
      const itineraryTop = index !== current ? itineraryScrollTarget(index) : null;
      paint(index);
      if (itineraryTop !== null) itinerary.scrollTo({ top: itineraryTop, behavior: "auto" });
    }

    function scheduleUpdate() {
      if (!frame) frame = requestAnimationFrame(updateReadingPosition);
    }

    function navigateTo(index, announce = false) {
      if (index < 0 || index >= stops.length) return;
      const stop = stops[index];
      navigationTarget = index;
      const hash = `#${encodeURIComponent(stop.id)}`;
      if (window.location.hash !== hash) history.pushState(history.state, "", hash);
      stop.focus({ preventScroll: true });
      stop.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
      if (announce && status) status.textContent = `${index + 1} / ${stops.length}，${labelAt(index)}`;
      scheduleUpdate();
    }

    function ordinaryClick(event) {
      return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    }

    routeLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        if (!ordinaryClick(event) || link.target && link.target !== "_self" || link.hasAttribute("download")) return;
        const index = indexForLink(link);
        if (index === undefined) return;
        event.preventDefault();
        navigateTo(index);
      });
    });
    previousButtons.forEach((button) => {
      button.addEventListener("click", () => navigateTo((navigationTarget ?? current) - 1, true));
    });
    nextButtons.forEach((button) => {
      button.addEventListener("click", () => navigateTo((navigationTarget ?? current) + 1, true));
    });

    function clearSharedTitle() {
      stops.forEach((stop) => stop.querySelector(".place-name")?.style.removeProperty("view-transition-name"));
    }

    document.querySelectorAll("a[data-article-link]").forEach((link) => {
      link.addEventListener("click", (event) => {
        if (!ordinaryClick(event) || link.target && link.target !== "_self") return;
        clearSharedTitle();
        link.closest("[data-stop]")?.querySelector(".place-name")?.style.setProperty("view-transition-name", "place-title");
      });
    });

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", () => { measureRoads = true; scheduleUpdate(); });
    window.addEventListener("hashchange", scheduleUpdate);
    window.addEventListener("popstate", () => { navigationTarget = null; scheduleUpdate(); });
    window.addEventListener("pageshow", () => {
      navigationTarget = null;
      clearSharedTitle();
      clearCaptionMotion();
      measureRoads = true;
      scheduleUpdate();
    });
    window.addEventListener("wheel", () => { navigationTarget = null; }, { passive: true });
    window.addEventListener("touchstart", () => { navigationTarget = null; }, { passive: true });
    reducedMotion.addEventListener("change", () => { clearCaptionMotion(); scheduleUpdate(); });
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => { measureRoads = true; scheduleUpdate(); });
      roads.forEach(({ road }) => observer.observe(road));
    }

    updateReadingPosition();
    document.querySelectorAll("[data-route-controls]").forEach((controls) => { controls.hidden = false; });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startJournal, { once: true });
  else startJournal();
})();
