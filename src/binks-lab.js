// BINKS LAB v1 — rehaussement progressif uniquement (aucune logique métier).
// Peint le remplissage --fill des sliders ; observe les rendus du workspace.
function paint(range) {
  const min = Number(range.min || 0);
  const max = Number(range.max || 100);
  const value = Number(range.value || 0);
  const span = max - min || 1;
  const percent = Math.min(100, Math.max(0, ((value - min) / span) * 100));
  range.style.setProperty("--fill", percent + "%");
}

function paintAll(root = document) {
  root.querySelectorAll('input[type="range"]').forEach(paint);
}

document.addEventListener(
  "input",
  (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === "range") {
      paint(event.target);
    }
  },
  { passive: true },
);

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.matches?.('input[type="range"]')) paint(node);
      node.querySelectorAll?.('input[type="range"]').forEach(paint);
    }
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
paintAll();
