/**
 * Scroll to the element matching location.hash on load and hashchange.
 * Skip modals (they are opened by their own script).
 */
function scrollToHash() {
  const hash = location.hash;
  if (!hash || hash.length < 2) return;
  const id = decodeURIComponent(hash.slice(1));
  const el = document.getElementById(id);
  if (!el) return;
  if (el.classList.contains("modal")) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scrollToHash);
} else {
  scrollToHash();
}
window.addEventListener("load", scrollToHash);
window.addEventListener("hashchange", scrollToHash);
