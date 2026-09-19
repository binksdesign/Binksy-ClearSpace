import { identity, arrow, esc, readyAssets, clearPanel } from "./ui.js";
import { variantIds, variantName } from "./model.js";
import { compositionSVG } from "./svg.js";
import { t } from "./i18n.js";

export const steps = [
  ["import", "Importer"],
  ["compose", "Zone de sécurité"],
  ["delivery", "Exporter"],
];
export const hasArtwork = (p) => (p.ready || []).length > 0;
export function disclosure(id, label, body) {
  return `<details class="optional" data-disclosure="${id}"><summary>${t(label)}</summary>${body}</details>`;
}
function projectPanel(p, projects) {
  return `<section><label class="field"><span>${t("Nom de la marque")}</span><input id="brand" value="${esc(p.brand)}" maxlength="100"></label>${disclosure("project", "Gérer le projet", `<select id="projects" aria-label="${t("Projet actif")}">${projects.map((x) => `<option value="${esc(x.id)}" ${x.id === p.id ? "selected" : ""}>${esc(x.id === p.id ? p.brand : x.brand)}</option>`).join("")}</select><button data-action="new">${t("Nouveau projet")}</button><button data-action="import-project">${t("Importer .binksy")}</button>`)}</section>`;
}
function imports(p) {
  return readyAssets(p);
}
function constructions(p) {
  return `<section class="construction-list"><h2>${t("Variantes du logo")}</h2>${variantIds(
    p,
  )
    .map(
      (v) =>
        `<div class="construction-choice ${p.active === v ? "active" : ""}"><button data-active="${v}" aria-pressed="${p.active === v}"><div class="choice-preview">${compositionSVG(p, v)}</div><span data-no-i18n>${esc(variantName(p, v))}</span></button><label><input type="checkbox" data-variant="${v}" aria-label="${t("Activer ") + esc(variantName(p, v))}" ${p.enabled.includes(v) ? "checked" : ""}>${t("Inclure")}</label></div>`,
    )
    .join("")}</section>`;
}
function properties(p, inspector) {
  const guides = `<section><div class="canvas-expert">${["grid", "snap"].map((key, i) => `<label class="check"><input type="checkbox" data-setting="${key}" ${p[key] ? "checked" : ""}>${t(["Grille", "Magnétisme"][i])}</label>`).join("")}</div>${clearPanel(p)}</section>`;
  return `<section class="inspector-title"><h2 data-no-i18n>${esc(variantName(p, p.active))}</h2><label class="field">${t("Nom de la version")}<input id="variant-name" value="${esc(p.ready.find((v) => v.id === p.active)?.name || "")}" maxlength="100"></label></section><div class="inspector-tabs" role="tablist" aria-label="${t("Réglages de la version")}"><button role="tab" data-inspector="guides" aria-selected="true" tabindex="0">${t("Zone de sécurité")}</button></div><div class="inspector-content" role="tabpanel">${guides}</div>`;
}

export function workspace(
  p,
  {
    view,
    projects,
    exportPanel,
    history,
    busy,
    inspector,
    focus,
  },
) {
  const route = steps;
  const index = steps.findIndex(([id]) => id === view),
    ready = hasArtwork(p);
  const guidance =
    view === "import" ? "Importez votre logo" : "Définissez la zone de sécurité";
  const left =
    view === "import"
      ? projectPanel(p, projects) + imports(p)
      : view === "compose"
        ? constructions(p)
        : "";
  const right =
    view === "compose" && ready
      ? properties(p, inspector)
      : view === "delivery"
        ? disclosure("export", "Personnaliser l’export", exportPanel())
        : "";
  const next = view === "import" ? "compose" : "delivery";
  const nextLabel =
    view === "import" ? "Définir la zone de sécurité" : "Préparer l’export";
  return `<header><div class="identity">${identity()}</div><nav aria-label="${t("Étapes")}">${route.map(([id, label], i) => `<button data-view="${id}" ${i && !ready ? "disabled" : ""} aria-current="${view === id ? "step" : "false"}" class="${view === id ? "active" : ""}"><small>0${i + 1}</small>${t(label)}</button>`).join("")}</nav><div class="header-actions"><button data-action="undo" aria-label="${t("Annuler")}" ${history.past.length ? "" : "disabled"}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="miter" aria-hidden="true"><path d="m9 4-5 5 5 5M4 9h15v11"/></svg></button><button data-action="redo" aria-label="${t("Rétablir")}" ${history.future.length ? "" : "disabled"}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="miter" aria-hidden="true"><path d="m15 4 5 5-5 5M20 9H5v11"/></svg></button><button data-action="export-project">${t("Sauvegarder .binksy")}</button></div></header><div class="workspace guided-workspace ${focus ? "focus-mode" : ""}" data-step="${view}" data-mode="${p.mode}">${left ? `<aside class="left">${left}</aside>` : ""}<main class="editor-main">${["import", "compose"].includes(view) ? `<div class="step-heading"><span class="eyebrow">0${index + 1} / ${t(view === "compose" ? "Zone de sécurité" : steps[index][1])}</span><h1>${t(guidance)}</h1></div><div class="canvas-toolbar"><strong data-no-i18n>${esc(p.brand)}</strong><div class="canvas-colors">${view === "compose" ? `<button data-action="focus" aria-pressed="${focus}">${t(focus ? "Afficher les panneaux" : "Mode focus")}</button><select id="zoom" aria-label="Zoom">${[0.5, 0.75, 1, 1.5, 2].map((n) => `<option value="${n}" ${n === 1 ? "selected" : ""}>${n * 100}%</option>`).join("")}</select>` : ""}<button data-canvas="#ffffff" aria-label="${t("Canvas blanc")}">${t("Clair")}</button><button data-canvas="#000000" aria-label="${t("Canvas noir")}">${t("Sombre")}</button></div></div><div id="stage" class="stage"></div><div class="canvas-footer"><span id="measure"></span></div><div class="step-next"><span data-no-i18n>${esc(variantName(p, p.active))}</span><button class="primary" data-view="${next}" ${ready ? "" : "disabled"}>${t(nextLabel)}${arrow}</button></div>` : '<div id="workshop"></div>'}</main>${right ? `<aside class="right" aria-label="${t("Propriétés")}" tabindex="0">${right}</aside>` : ""}</div><footer><span id="save-state">${t("Enregistré sur cet appareil")}</span></footer><div id="notice" role="status" hidden></div><input id="project-file" type="file" accept=".json,.binksy" hidden>`;
}
