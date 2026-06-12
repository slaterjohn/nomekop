"use client";

/**
 * Flies a little pokeball ghost from a collected pocket into the collection
 * bar ([data-gb-collection-bar]). Pure decoration: skipped under reduced
 * motion, never throws, cleans itself up.
 */
export function flyToCollectionBar(from: HTMLElement): void {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bar = document.querySelector("[data-gb-collection-bar]");
    if (!bar) return;

    const a = from.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    const ghost = document.createElement("span");
    ghost.className = "gb-fly-ghost";
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.left = `${a.left + a.width / 2 - 9}px`;
    ghost.style.top = `${a.top + a.height / 2 - 9}px`;
    document.body.appendChild(ghost);

    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ghost.style.transform = `translate(${dx}px, ${dy}px) scale(0.45)`;
        ghost.style.opacity = "0.25";
      });
    });
    ghost.addEventListener("transitionend", () => ghost.remove(), { once: true });
    setTimeout(() => ghost.remove(), 800); // safety net
  } catch {
    // decoration must never break collecting
  }
}
