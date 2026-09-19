import { assetMarkup } from "./svg.js";
import { t } from "./i18n.js";
import { CLEAR_REFS, clearMeasure, variantName, variantIds } from "./model.js";
export const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const arrow =
  '<img class="arrow" src="/brand/arrow.svg" alt="" aria-hidden="true">';
const projectModeLabel = () => "Zone de sécurité";
// Aperçu de carte : première variante disponible.
function projectThumb(p) {
  const candidates = [...(p.ready || []).map((v) => v.id)];
  for (const id of candidates) {
    try {
      const asset = p.ready.find((v) => v.id === id)?.asset;
      if (asset) return assetMarkup(asset, null, `home-${p.id}-${id}`);
    } catch (e) {
      /* variante illisible : on essaie la suivante */
    }
  }
  return "";
}
export function identity() {
  return `<button class="brand-home" data-view="home" aria-label="BINKSY CLEARSPACE — Accueil"><img src="/brand/clearspace.svg" alt="BINKSY CLEARSPACE"></button><a class="creator" href="https://www.instagram.com/graphiste.binks/" target="_blank" rel="noopener noreferrer">by binks design</a>`;
}
export function home(projects) {
  return `<div class="landing"><header><div class="identity">${identity()}</div></header><div class="home-layout"><aside class="project-nav"><button class="import-home" data-action="import-project"><span>Importer un fichier .binksy</span>${arrow}</button><div class="section-title">VOS PROJETS <span>${projects.length}</span></div>${projects.length ? `<div class="project-grid">${projects.map((p) => { const thumb = projectThumb(p); return `<article class="project-card"><button class="project-open" data-open="${esc(p.id)}" aria-label="${esc(p.brand)} — ${esc(t(projectModeLabel(p)))}"><span class="project-card-mark">${thumb || '<span class="project-card-empty">B</span>'}</span><span class="project-card-meta"><strong data-no-i18n>${esc(p.brand)}</strong><small>${t(projectModeLabel(p))}</small></span></button></article>`; }).join("")}</div>` : '<p class="muted">Vos projets apparaîtront ici.</p>'}</aside><main class="home-content"><div class="eyebrow">DÉFINIR · VISUALISER · EXPORTER</div><h1>Votre logo.<br>Sa zone de sécurité<span class="accent">.</span></h1><p class="home-intro">Définissez l’espace minimal autour de votre logo et exportez des planches impeccables.</p><div class="mode-grid"><button data-mode="clearspace" aria-label="Nouveau projet — Juste la zone de sécurité"><span class="mode-number">01</span><h2>Juste la zone de sécurité</h2><p>Vos versions sont terminées. Définissez uniquement leur zone de sécurité.</p><span class="mode-cta">Définir mes zones de sécurité ${arrow}</span></button></div><p class="privacy">Sans compte. Vos SVG et projets restent sur cet appareil.</p></main></div></div>`;
}
export function readyAssets(p) {
  return `<section class="ready-assets"><h2>${t("Variantes déjà prêtes")}</h2><label class="file-button ready-upload">+ ${t("Ajouter une variante SVG")}<input id="ready-files" aria-label="${t("Importer des variantes SVG")}" type="file" accept=".svg,image/svg+xml" multiple hidden></label>${p.ready.map((v) => `<div class="ready-card"><button class="ready-preview" data-active="${v.id}" aria-label="${t("Choisir la variante")} · ${esc(v.name)}">${assetMarkup(v.asset, null, "ready-import-" + v.id)}</button><input data-ready-name="${v.id}" aria-label="${t("Nom de la variante")}" value="${esc(v.name)}" maxlength="100" data-no-i18n><div class="ready-actions"><label class="file-button">${t("Remplacer le SVG")}<input data-replace-variant="${v.id}" type="file" accept=".svg,image/svg+xml" aria-label="${t("Remplacer le SVG")} · ${esc(v.name)}" hidden></label><button data-remove-variant="${v.id}" aria-label="${t("Supprimer")} · ${esc(v.name)}">${t("Supprimer")}</button></div></div>`).join("")}<details><summary>${t("Mon SVG contient du texte")}</summary><label class="file-button">${t("Charger la police exacte OTF / TTF")}<input id="font" aria-label="${t("Police pour vectoriser les SVG")}" type="file" accept=".otf,.ttf" hidden></label></details></section>`;
}
export function clearPanel(p) {
  const c = p.compositions[p.active], m = clearMeasure(p);
  const method = c.clearMethod || (c.references?.[c.clearRef] ? "part" : "auto");
  return `<section class="clear-settings"><h3>${t("Zone de sécurité")}</h3><label class="check"><input data-setting="clear" type="checkbox" ${p.clear ? "checked" : ""}>${t("Afficher la zone de sécurité")}</label><label class="field"><span>${t("Comment définir la mesure ?")}</span><select id="clear-method">${[["auto","Automatique"],["part","Utiliser une partie du logo"],["visual","Mesurer directement sur le logo"]].map(([id,label]) => `<option value="${id}" ${method === id ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label>${method === "part" ? `<label class="field"><span>${t("Mesure utilisée")}</span><select id="clear-reference" aria-label="${t("Mesure utilisée")}">${Object.entries(CLEAR_REFS).map(([key,label]) => `<option value="${key}" ${c.clearRef === key ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label><label class="field"><span>${t("Mesure de la référence · unités SVG")}</span><input id="clear-reference-value" type="number" min=".01" step="any" value="${c.references?.[c.clearRef] || ""}"></label>` : ""}<button class="measure-button" data-action="measure">${t("Définir visuellement")}</button>${method === "visual" && c.visualMeasure ? `<label class="field"><span>${t("Cette mesure correspond à :")}</span><input id="measure-name" maxlength="160" value="${esc(c.visualMeasure.label)}" placeholder="${t("Hauteur du M")}"></label><label class="field"><span>${t("Mesure utilisée")} · ${t("unités SVG")}</span><input id="visual-value" type="number" min=".01" max="1000000" step="any" value="${c.visualMeasure.value}"></label>` : ""}<div class="segmented multipliers">${[.5,1,1.5,2].map(n => `<button data-multiplier="${n}" aria-pressed="${c.clearMultiplier === n}">${"×" + n}</button>`).join("")}</div><label class="field"><span>${t("Multiplicateur")}</span><input id="clear-multiplier" type="number" min=".05" max="5" step="any" value="${c.clearMultiplier}"></label><output class="clear-value">X = ${m.value.toFixed(2)} × ${m.multiplier} = ${m.space.toFixed(2)} ${t("unités")}</output>${variantIds(p).length > 1 ? `<details class="optional" data-disclosure="apply-measure"><summary>${t("Appliquer à d’autres versions")}</summary><p>${t("La mesure et le multiplicateur seront copiés à l’identique.")}</p>${variantIds(p).filter(v => v !== p.active).map(v => `<label class="check"><input type="checkbox" data-copy-rule="${v}"><span data-no-i18n>${esc(variantName(p,v))}</span></label>`).join("")}<button data-action="copy-rule">${t("Appliquer la règle")}</button></details>` : ""}<details class="optional" data-disclosure="boards"><summary>${t("Exporter une planche")}</summary><div class="clear-preview-actions"><button data-board="dark">${t("Planche foncée")}${arrow}</button><button data-board="light">${t("Planche claire")}${arrow}</button></div></details></section>`;
}

