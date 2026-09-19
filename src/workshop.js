import { normalizeFormats } from "./export-formats.js";
import { clearspaceSVG } from "./clearspace.js";
import {
  catalog,
  CATEGORIES,
  selectedCount,
  selectedItems,
  deliveries,
} from "./catalog.js";
import {
  variantIds,
  variantName,
  colors,
  clearMeasure,
} from "./model.js";
import { exportPlan } from "./export.js";
import { esc } from "./ui.js";
import { t, translateDOM } from "./i18n.js";
const labels = {
  original: "Original",
  mono: "Couleurs simples",
  multi: "Variantes multicolores",
  gradient: "Dégradés",
};
let filter = "all",
  finalCategory = "all",
  finalBg = "all",
  finalFormat = "all",
  finalPage = 0;
export function resetColorChoices(p) {
  p.colorSelection = {};
  p.selectedDescriptors = {};
  p.excluded = [];
  p.excludedFiles = [];
}
export function assetsFor(p) {
  return [...(p.ready || []).map((v) => ({ key: v.id, name: v.name, asset: v.asset }))];
}
function accordion(id, label, summary, body) {
  return `<details class="workflow-section" data-section="${id}"><summary><strong>${t(label)}</strong><span>${summary}</span></summary><div class="workflow-body">${body}</div></details>`;
}
export function mountWorkshop(p, edit, runExport) {
  if (filter !== "all" && !variantIds(p).includes(filter)) filter = "all";
  const main = document.querySelector(".editor-main");
  const toolsOpen = main.querySelector(".combination-tools")?.open;
  const opts = variantIds(p)
    .map(
      (v) =>
        `<option value="${v}" ${filter === v ? "selected" : ""}>${esc(variantName(p, v))}</option>`,
    )
    .join("");
  main.innerHTML = `<div class="family-heading"><div class="eyebrow">02 / ${t("Sélection finale")}</div><h1>${t("Choisir les couleurs, puis la livraison.")}</h1></div><div class="family-tools"><button id="full-system" title="${t("Génère toutes les combinaisons possibles.")}">${t("Système complet")}</button><select id="construction-filter" aria-label="${t("Toutes les constructions")}"><option value="all">${t("Toutes les constructions")}</option>${opts}</select></div>`;
  let items = [],
    jobs = [],
    allJobs = [],
    error = "";
  try {
    items = deliveries(p, selectedItems(p));
    allJobs = exportPlan(p, items, true);
    jobs = exportPlan(p, items);
  } catch (e) {
    error = t(e.message);
  }
  const totalFiles = jobs.length,
    fileCount = totalFiles + (totalFiles > 1 ? 1 : 0);
  const finalJobs = allJobs.filter(
    (j) =>
      (filter === "all" || (j.item?.variant || j.variant) === filter) &&
      (finalCategory === "all" ||
        (j.tone ? "clearspace" : j.item?.category) === finalCategory) &&
      (finalFormat === "all" || j.format === finalFormat) &&
      (finalBg === "all" ||
        (finalBg === "transparent"
          ? !j.item?.background
          : j.item?.background?.id === finalBg)),
  );
  finalPage = Math.max(
    0,
    Math.min(finalPage, Math.ceil(finalJobs.length / 50) - 1),
  );
  main.insertAdjacentHTML(
    "beforeend",
    accordion(
      "final",
      "Sélection finale",
      error || `${fileCount} ${t("fichiers à exporter")}`,
      `<div class="family-tools"><select id="final-category" aria-label="${t("Toutes les catégories")}"><option value="all">${t("Toutes les catégories")}</option>${[...CATEGORIES, "clearspace"].map((c) => `<option value="${c}" ${finalCategory === c ? "selected" : ""}>${t(labels[c] || "Clearspace")}</option>`).join("")}</select><select id="final-format" aria-label="${t("Tous les formats")}"><option value="all">${t("Tous les formats")}</option>${p.exports.formats.map((f) => `<option value="${f}" ${finalFormat === f ? "selected" : ""}>${f.toUpperCase()}</option>`).join("")}</select><select id="final-background" aria-label="${t("Tous les fonds JPEG")}"><option value="all">${t("Tous les fonds JPEG")}</option><option value="transparent" ${finalBg === "transparent" ? "selected" : ""}>${t("Transparent")}</option>${colors(
        p,
      )
        .filter((c) => c.hex)
        .map(
          (c) =>
            `<option value="${c.id}" ${finalBg === c.id ? "selected" : ""}>${esc(c.name)}</option>`,
        )
        .join(
          "",
        )}</select><button id="exclude-final">${t("Tout désélectionner")}</button></div><p role="status">${esc(error || `${fileCount} ${t("fichiers à exporter")}`)}</p><div class="final-list">${finalJobs
        .slice(finalPage * 50, finalPage * 50 + 50)
        .map(
          (j) =>
            `<label><input type="checkbox" ${p.excludedFiles?.includes(j.key) || p.excludedFiles?.includes(j.path) ? "" : "checked"} data-file-select="${esc(j.key)}"><span data-no-i18n>${esc(j.path.split("/").pop())}</span></label>`,
        )
        .join(
          "",
        )}</div><div class="pagination"><button id="final-prev" ${!finalPage ? "disabled" : ""}>${t("Précédente")}</button><span>${finalPage + 1} / ${Math.max(1, Math.ceil(finalJobs.length / 50))}</span><button id="final-next" ${(finalPage + 1) * 50 >= finalJobs.length ? "disabled" : ""}>${t("Suivante")}</button></div>`,
    ),
  );
  main.querySelector(".family-heading").innerHTML =
    `<div class="eyebrow">03 / ${t("Exporter")}</div><h1>${t("Votre Logo Kit est prêt à partir.")}</h1>`;
  const toolbar = main.querySelector(".family-tools");
  const custom = document.createElement("details");
  custom.className = "combination-tools";
  custom.innerHTML = `<summary>${t("Personnaliser les combinaisons")}</summary>`;
  toolbar.before(custom);
  custom.append(toolbar);
  custom.open = !!toolsOpen;
  custom.hidden = true;
  // Keep the final-file construction filter usable independently of the gallery.
  main
    .querySelector('[data-section="final"] .family-tools')
    .prepend(main.querySelector("#construction-filter"));
  const summary = document.createElement("section");
  summary.className = "kit-summary";
  summary.innerHTML = `<div class="kit-previews">${p.enabled
    .filter((v) => catalog(p, v, "original").size)
    .map(
      (v) =>
        `<div>${clearspaceSVG(p, v)}<span data-no-i18n>${esc(variantName(p, v))}</span>${p.exports.clearspace ? `<small class="summary-measure">${t("Zone de sécurité")} · ${clearMeasure(p, v).space.toFixed(2)} ${t("unités")}</small>` : ""}</div>`,
    )
    .join(
      "",
    )}</div><div class="kit-metrics"><span><strong>${p.enabled.filter((v) => catalog(p, v, "original").size).length}</strong>${t("versions du logo")}</span><span><strong>${p.enabled.reduce((sum, v) => sum + CATEGORIES.reduce((n, c) => n + selectedCount(p, v, c), 0n), 0n)}</strong>${t("zones de sécurité")}</span><span><strong>${error ? "—" : fileCount}</strong>${t("fichiers")}</span></div><h2>${t("Vos zones de sécurité")}</h2><div class="export-recap"><p>${[...new Set(jobs.map((j) => j.format.toUpperCase()))].join(" · ")}</p><p>${normalizeFormats(p.exports).selected.map((f) => `${esc(t(f.name))} (${f.width} × ${f.height})`).join(" · ")}</p><p>WEB · ${jobs.filter((j) => j.target?.destination === "WEB" || j.target?.kind === "use").length} ${t("fichiers")} / PRINT · ${jobs.filter((j) => j.target?.destination === "PRINT").length} ${t("fichiers")}</p><p>Brand Guideline · ${t("Guide non inclus")}</p></div><button class="primary" id="export-kit" ${error || !jobs.length ? "disabled" : ""}>${t("Exporter les zones de sécurité")}</button><p role="status">${esc(error || String(fileCount) + " " + t("fichiers à exporter"))}</p>`;
  main.querySelector(".family-heading").after(summary);
  summary.querySelector("#export-kit").onclick = () => runExport(items);
  const versionCount = document.querySelector(".selected-versions");
  if (versionCount)
    versionCount.textContent = `${p.enabled.reduce((sum, v) => sum + CATEGORIES.reduce((n, c) => n + selectedCount(p, v, c), 0n), 0n)} ${t("versions sélectionnées")}`;
  const countTarget = document.querySelector("#selection-count");
  if (countTarget)
    countTarget.textContent = error || `${fileCount} ${t("fichiers à exporter")}`;
  if (document.querySelector('[data-action="export"]'))
    document.querySelector('[data-action="export"]').onclick = () => {
      if (error) return;
      runExport(deliveries(p, selectedItems(p)));
    };
  main.querySelector("#construction-filter").onchange = (e) => {
    filter = e.target.value;
    mountWorkshop(p, edit, runExport);
  };
  const remove = (paths) =>
    edit(() => {
      p.excludedFiles = [...new Set([...(p.excludedFiles || []), ...paths])];
    });
  main.querySelectorAll("[data-file-select]").forEach(
    (el) =>
      (el.onchange = () =>
        edit(() => {
          p.excludedFiles = el.checked
            ? (p.excludedFiles || []).filter(
                (x) =>
                  x !== el.dataset.fileSelect &&
                  x !==
                    allJobs.find((j) => j.key === el.dataset.fileSelect)?.path,
              )
            : [...(p.excludedFiles || []), el.dataset.fileSelect];
        })),
  );
  main.querySelector("#exclude-final").onclick = () =>
    remove(finalJobs.map((j) => j.key));
  main.querySelector("#final-category").onchange = (e) => {
    finalCategory = e.target.value;
    mountWorkshop(p, edit, runExport);
  };
  main.querySelector("#final-background").onchange = (e) => {
    finalBg = e.target.value;
    mountWorkshop(p, edit, runExport);
  };
  main.querySelector("#final-format").onchange = (e) => {
    finalFormat = e.target.value;
    mountWorkshop(p, edit, runExport);
  };
  main.querySelector("#final-prev").onclick = () => {
    finalPage--;
    mountWorkshop(p, edit, runExport);
  };
  main.querySelector("#final-next").onclick = () => {
    finalPage++;
    mountWorkshop(p, edit, runExport);
  };
  translateDOM(main);
}
