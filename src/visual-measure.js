import { t } from "./i18n.js";

// La géométrie travaille en unités SVG, indépendamment du zoom et de l'écran.
// Aucun magnétisme : la position du pointeur est la vérité.
export function measureSquare(start, point) {
  const dx = point.x - start.x,
    dy = point.y - start.y;
  const size = Math.min(1e6, Math.max(Math.abs(dx), Math.abs(dy)));
  const sx = dx < 0 ? -1 : 1,
    sy = dy < 0 ? -1 : 1;
  return {
    x: start.x + (sx < 0 ? -size : 0),
    y: start.y + (sy < 0 ? -size : 0),
    size,
  };
}

export function startVisualMeasure({ canvas, previous, commit, finish }) {
  if (!canvas) return;
  const controller = new AbortController(),
    { signal } = controller;
  const stage = canvas.parentElement;
  stage.classList.add("measuring");
  const hint = document.createElement("div");
  hint.className = "measurement-hint";
  hint.innerHTML = `<span>${t("Tracez un carré sur le logo")}</span><button>${t("Annuler")}</button>`;
  stage.append(hint);
  let overlay,
    drag = null;
  const clean = () => {
    controller.abort();
    overlay?.remove();
    hint.remove();
    stage.classList.remove("measuring");
    finish();
  };
  hint.querySelector("button").onclick = clean;
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        clean();
      }
    },
    { signal },
  );
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const matrix = canvas.getScreenCTM().inverse();
      const start = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix);
      drag = { start, matrix, pointer: e.pointerId, square: null };
      if (e.isTrusted) canvas.setPointerCapture(e.pointerId);
      overlay?.remove();
      overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
      overlay.setAttribute("data-measure-overlay", "");
      overlay.setAttribute("pointer-events", "none");
      canvas.append(overlay);
    },
    { capture: true, signal },
  );
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (!drag || e.pointerId !== drag.pointer) return;
      const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
        drag.matrix,
      );
      const square = measureSquare(drag.start, point);
      drag.square = square;
      const { x, y, size } = square,
        fs = 12 * Math.hypot(drag.matrix.a, drag.matrix.b);
      overlay.innerHTML = `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#ff5500" fill-opacity=".16" stroke="#ff5500" stroke-width="2" vector-effect="non-scaling-stroke"/><text x="${x}" y="${y - fs * 0.6}" font-size="${fs}" fill="#b33b00" stroke="white" stroke-width="${fs * 0.15}" paint-order="stroke">${size.toFixed(2)} ${t("unités")}</text>`;
    },
    { signal },
  );
  canvas.addEventListener(
    "pointerup",
    (e) => {
      if (!drag || e.pointerId !== drag.pointer) return;
      const square = drag.square;
      clean();
      if (!square || square.size < 0.01) return;
      commit({ value: Math.round(square.size * 100) / 100, label: previous || "" });
    },
    { signal },
  );
  canvas.addEventListener("pointercancel", clean, { signal });
  return clean;
}
