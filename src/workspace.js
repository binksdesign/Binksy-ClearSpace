import { identity, arrow, esc } from "./ui.js";
import { assetMarkup } from "./svg.js";
import {
  variantIds,
  variantName,
  composition,
  clearMeasure,
  MULTIPLIERS,
} from "./model.js";
import { t } from "./i18n.js";

const METHOD_LABELS = {
  height: "Hauteur du logo",
  width: "Largeur du logo",
  visual: "Visuel",
};

function variantCards(p) {
  if (!p.ready.length)
    return `<p class="muted">${t("Aucune variante. Importez vos SVG.")}</p>`;
  return p.ready
    .map(
      (v) => `<div class="ready-card ${p.active === v.id ? "active" : ""}">
      <button class="ready-preview" data-active="${esc(v.id)}" aria-pressed="${p.active === v.id}" aria-label="${t("Afficher la variante")} · ${esc(v.name)}">${assetMarkup(v.asset, null, "thumb-" + v.id)}</button>
      <input data-ready-name="${esc(v.id)}" aria-label="${t("Nom de la variante")}" value="${esc(v.name)}" maxlength="100" data-no-i18n>
      <label class="check"><input type="checkbox" data-variant="${esc(v.id)}" ${p.enabled.includes(v.id) ? "checked" : ""}>${t("Inclure dans l’export")}</label>
      <div class="ready-actions"><label class="file-button">${t("Remplacer")}<input data-replace-variant="${esc(v.id)}" type="file" accept=".svg,image/svg+xml" hidden></label><button data-remove-variant="${esc(v.id)}" aria-label="${t("Supprimer")} · ${esc(v.name)}">${t("Supprimer")}</button></div>
    </div>`,
    )
    .join("");
}

function methodsPanel(p) {
  const c = composition(p);
  const isVisual = c.method === "visual";
  return `<section class="clear-settings">
    <label class="check"><input data-setting="clear" type="checkbox" ${p.clear ? "checked" : ""}>${t("Afficher la zone de sécurité")}</label>
    <h3>${t("Définir X")}</h3>
    <div class="segmented methods">${["height", "width", "visual"]
      .map(
        (m) =>
          `<button data-method="${m}" aria-pressed="${c.method === m}">${t(METHOD_LABELS[m])}</button>`,
      )
      .join("")}</div>
    ${
      isVisual
        ? `<button class="measure-button" data-action="measure">${t("Tracer la mesure")}</button>
           <label class="field"><span>${t("Nom de la mesure")} · ${t("facultatif")}</span><input id="measure-name" maxlength="160" placeholder="${t("Hauteur du A")}" value="${esc(c.label)}"></label>
           <label class="field"><span>${t("Valeur de X")} · ${t("unités SVG")}</span><input id="visual-value" type="number" min=".01" max="1000000" step="any" value="${c.measure ?? ""}"></label>`
        : `<p class="muted">${t("X suit automatiquement la dimension réelle du SVG importé.")}</p>`
    }
    <output class="clear-value" role="status">${calculation(p)}</output>
    <h3>${t("Multiplicateur")}</h3>
    <div class="segmented multipliers">${MULTIPLIERS.map((n) => `<button data-multiplier="${n}" aria-pressed="${c.multiplier === n}">×${n}</button>`).join("")}</div>
    <label class="field"><span>${t("Personnalisé")} (0,05 – 5)</span><input id="clear-multiplier" type="number" min=".05" max="5" step="any" value="${c.multiplier}"></label>
  </section>`;
}

export function calculation(p, v = p.active) {
  const m = clearMeasure(p, v);
  const f = (n) => Number(n).toFixed(2).replace(/\.00$/, "").replace(".", ",");
  return `<span>X = ${esc(m.label)}</span><span>X = ${f(m.value)} ${t("unités")}</span><span>${t("Zone de sécurité")} = ${f(m.value)} × ${f(m.multiplier)} = ${f(m.space)} ${t("unités")}</span>`;
}

export function workspace(p, { history, busy }) {
  const hasVariants = p.ready.length > 0;
  const active = hasVariants ? variantName(p, p.active) : "";
  const exportCount = p.enabled.length;
  return `<header><div class="identity">${identity()}</div><div class="header-actions"><button data-action="undo" aria-label="${t("Annuler")}" ${history.past.length ? "" : "disabled"}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="miter" aria-hidden="true"><path d="m9 4-5 5 5 5M4 9h15v11"/></svg></button><button data-action="redo" aria-label="${t("Rétablir")}" ${history.future.length ? "" : "disabled"}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="miter" aria-hidden="true"><path d="m15 4 5 5-5 5M20 9H5v11"/></svg></button></div></header>
  <div class="workspace guided-workspace">
    <aside class="left" aria-label="${t("Variantes")}">
      <section class="ready-assets">
        <h2>${t("Variantes du logo")}</h2>
        <label class="file-button ready-upload">+ ${t("Ajouter des SVG")}<input id="ready-files" type="file" accept=".svg,image/svg+xml" multiple hidden></label>
        <div class="variant-list">${variantCards(p)}</div>
      </section>
    </aside>
    <main class="editor-main">
      <div class="canvas-toolbar">
        <strong data-no-i18n>${esc(active)}</strong>
        <div class="canvas-colors"><button data-canvas="#ffffff" aria-pressed="${p.canvas === "#ffffff"}">${t("Clair")}</button><button data-canvas="#000000" aria-pressed="${p.canvas === "#000000"}">${t("Sombre")}</button></div>
      </div>
      <div id="stage" class="stage"></div>
      <div class="canvas-footer"><span id="measure"></span></div>
      <div class="export-bar">
        <div class="export-formats">${["svg", "png", "jpeg", "pdf"].map((f) => `<label class="check"><input type="checkbox" data-format="${f}" ${p.exports.formats.includes(f) ? "checked" : ""}>${f.toUpperCase()}</label>`).join("")}</div>
        <button class="primary export-button" data-action="export" ${busy || !exportCount ? "disabled" : ""}>${t("Exporter")} · ${exportCount} ${exportCount > 1 ? t("variantes") : t("variante")} (ZIP)${arrow}</button>
      </div>
    </main>
    <aside class="right" aria-label="${t("Zone de sécurité")}">
      ${
        hasVariants
          ? `<section class="inspector-title"><h2 data-no-i18n>${esc(active)}</h2></section>${methodsPanel(p)}`
          : `<section class="clear-settings"><h3>${t("Zone de sécurité")}</h3><p class="muted">${t("Importez un SVG pour définir sa zone de sécurité.")}</p></section>`
      }
    </aside>
  </div>`;
}
