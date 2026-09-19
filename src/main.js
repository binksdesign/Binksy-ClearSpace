import './tooltips.js';
import { readProjects, storeProjects } from './project-storage.js';
import { formatControls, bindFormats } from "./format-editor.js";
import { startVisualMeasure, copyClearRule } from "./visual-measure.js";
import { workspace, hasArtwork } from "./workspace.js";
import { selectedItems, deliveries } from "./catalog.js";
import { mountWorkshop, resetColorChoices } from "./workshop.js";
import { t, language, setLanguage, translateDOM } from "./i18n.js";
import { home, arrow } from "./ui";
import { clearspaceSVG, clearGuides } from "./clearspace";
import { validate } from "./project";
import "./style.css";
import "./binks-lab.css";
import "./binks-lab.js";
import {
  project,
  layout,
  History,
  clone,
  variantName,
  uniqueVariantName,
  clearMeasure,
} from "./model";
import { importSVG, assetContent, compositionSVG } from "./svg";
import { exportFiles, download } from "./export";
import opentype from "opentype.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const ROUTES = Object.freeze({ home: "/" });
const history = new History();
let projects = [],
  p,
  view = "home",
  zoom = 1,
  inspector = "guides",
  focus = false,
  cancelMeasurement = null,
  font = null,
  saving,
  busy = false;
try {
  projects = await readProjects();
  if (!Array.isArray(projects)) projects = [];
  p = projects[0] ? await validate(projects[0]) : project();
} catch {
  p = project();
  projects = [p];
  queueMicrotask(() =>
    notice("Sauvegarde locale illisible. Importez votre fichier projet."),
  );
}

function save() {
  p.locale = language();
  projects = projects.map((x) => (x.id === p.id ? clone(p) : x));
  clearTimeout(saving);
  $("#save-state").textContent = t("Enregistrement…");
  saving = setTimeout(async () => {
    const task=saving;
    try {
      await storeProjects(projects);
      if(saving===task){saving=null;$("#save-state").textContent = t("Enregistré sur cet appareil");}
    } catch {
      $("#save-state").textContent =
        "Sauvegarde impossible — exportez le projet";
      notice(
        "Stockage local plein ou indisponible. Exportez votre fichier projet.",
      );
    }
  }, 350);
}
function edit(fn, redraw = true) {
  history.push(p);
  fn();
  save();
  if (redraw) render();
}
function notice(message) {
  let n = $("#notice");
  if (!n) return;
  n.textContent = t(message);
  n.hidden = false;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => (n.hidden = true), 9000);
}
function syncRoute() {
  if (window.location.pathname !== ROUTES.home)
    window.history.replaceState({}, "", ROUTES.home);
  document.title = "Binksy ClearSpace — Zone de sécurité du logo";
}
function handleViewLink(event, element) {
  if (element.tagName !== "A") return true;
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  )
    return false;
  event.preventDefault();
  return true;
}
function render() {
  syncRoute();
  cancelMeasurement?.();
  if (view !== "compose") focus = false;
  const windowScroll = { left: window.scrollX, top: window.scrollY };
  const scrolls = [".left", ".right", "main", ".guided-workspace"].map((selector) => [
    selector,
    $(selector)?.scrollTop || 0,
  ]);
  if (view === "home") {
    $("#app").innerHTML =
      home(projects) +
      `<footer><span id="save-state">Projets enregistrés sur cet appareil</span><span>SVG · PNG · JPEG · PDF</span></footer><div id="notice" role="status" hidden></div><input id="project-file" type="file" accept=".binksy,.json" hidden>`;
    bindLanding();
    bindLanguage();
    bindProjectDeletion();
    if(saving)$("#save-state").textContent=t("Enregistrement…");
    translateDOM();
    return;
  }

  const opened = [...document.querySelectorAll("[data-disclosure][open]")].map(
    (el) => el.dataset.disclosure,
  );
  $("#app").innerHTML = workspace(p, {
    view,
    projects,
    exportPanel,
    history,
    busy,
    inspector,
    focus,
  });
  for (const id of opened)
    document
      .querySelector(`[data-disclosure="${id}"]`)
      ?.setAttribute("open", "");
  document.querySelectorAll("[data-inspector]").forEach(el => {
    el.onclick = () => { inspector = el.dataset.inspector; render(); };
    el.onkeydown = e => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const tabs = [...document.querySelectorAll("[data-inspector]")];
      const index = tabs.indexOf(el);
      const next = e.key === "Home" ? tabs[0] : e.key === "End" ? tabs.at(-1) : tabs[(index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      inspector = next.dataset.inspector; render();
      document.querySelector(`[data-inspector="${inspector}"]`).focus();
    };
  });
  bind();
  bindExtra();
  bindLanguage();
  bindProjectDeletion();
  if (["import", "compose"].includes(view)) drawStage();
  else mountWorkshop(p, edit, runExport, view);
  const restoreScroll = () => {
    for (const [selector, top] of scrolls)
      if ($(selector)) $(selector).scrollTop = top;
    window.scrollTo(windowScroll.left, windowScroll.top);
  };
  restoreScroll();
  requestAnimationFrame(restoreScroll);
  if(saving)$("#save-state").textContent=t("Enregistrement…");
  translateDOM();
}
function exportPanel() {
  const e = p.exports;
  return `<div class="properties-title">EXPORT</div><section><div class="section-title">FORMATS</div><div class="formats">${["svg", "png", "pdf"].map((f) => `<label><input type="checkbox" data-format="${f}" ${e.formats.includes(f) ? "checked" : ""}>${f.toUpperCase()}</label>`).join("")}</div><p class="muted">SVG, PNG et PDF toujours transparents.</p></section>${formatControls(p)}<section></section><div class="export-bottom"><span id="selection-count"></span><button class="primary export-button" data-action="export" ${busy ? "disabled" : ""}>Exporter la sélection ${arrow}</button><p class="muted">ZIP automatique pour plusieurs fichiers.<br>Recommandations incluses dans le ZIP.</p></div>`;
}
function drawStage() {
  const l = layout(p),
    stage = $("#stage");
  if (!l.parts.length) {
    stage.innerHTML = `<div class="empty import-empty"><span class="empty-mark">${arrow}</span><h2>${t("Déposez votre premier SVG")}</h2><p>${t("Une icône, un logotype ou une variante assemblée suffit pour commencer.")}</p></div>`;
    return;
  }
  if (view === "import") {
    stage.style.background = p.canvas;
    stage.innerHTML = `<div class="import-logo-preview">${compositionSVG(p, p.active)}</div><span class="auto-note">${t("Analyse terminée · votre système est prêt")}</span>`;
    $("#measure").textContent = "";
    return;
  }
  const margin = Math.max(l.X * 1.5, clearMeasure(p).space + 25),
    w = (l.width + margin * 2) / zoom,
    h = (l.height + margin * 2) / zoom,
    x = l.x + l.width / 2 - w / 2,
    y = l.y + l.height / 2 - h / 2;
  stage.innerHTML = `<span class="stage-label" data-no-i18n>${esc(p.brand)} <span>/ ${esc(variantName(p, p.active))}</span></span><svg id="canvas" xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}"><defs><pattern id="grid" x="${l.parts.find((q) => q.key === "wordmark")?.x || 0}" y="${l.parts.find((q) => q.key === "wordmark")?.y || 0}" width="${l.X}" height="${l.X}" patternUnits="userSpaceOnUse"><path d="M ${l.X} 0 L 0 0 0 ${l.X}" fill="none" stroke="#c6c6c6" stroke-width=".6" vector-effect="non-scaling-stroke"/></pattern></defs>${p.grid ? `<rect x="${x - w}" y="${y - h}" width="${w * 3}" height="${h * 3}" fill="url(#grid)"/>` : ""}<g id="clear-guides">${p.clear ? clearGuides(l, clearMeasure(p).space, p.canvas === "#000000" ? "light" : "dark") : ""}</g>${l.parts.map((q) => `<g transform="translate(${q.x} ${q.y})"><svg width="${q.w}" height="${q.h}" viewBox="${q.asset.box.x} ${q.asset.box.y} ${q.asset.box.width} ${q.asset.box.height}" overflow="visible">${assetContent({ ...q.asset, roles: [] }, null, "stage-" + q.key)}</svg><rect width="${q.w}" height="${q.h}" fill="transparent" stroke="transparent" stroke-width="1" vector-effect="non-scaling-stroke"/></g>`).join("")}</svg><span class="stage-caption">${t("Construction d’origine conservée.")}</span>`;
  $("#measure").textContent =
    `X = ${l.X.toFixed(2)} unités SVG · Logo ${l.width.toFixed(1)} × ${l.height.toFixed(1)}`;
  stage.style.background = p.canvas;
  stage.classList.toggle("dark-canvas", p.canvas === "#000000");
  translateDOM(stage);
}

function bind() {
  bindFormats(document,p,edit);
  document.querySelectorAll("[data-view]").forEach(
    (el) =>
      (el.onclick = (event) => {
        if (!handleViewLink(event, el)) return;
        view = el.dataset.view;
        render();
      }),
  );
  document.querySelectorAll("[data-active]").forEach(
    (el) =>
      (el.onclick = () => {
        p.active = el.dataset.active;
        save();
        render();
      }),
  );
  document
    .querySelectorAll("[data-setting]")
    .forEach(
      (el) =>
        (el.onchange = () => edit(() => (p[el.dataset.setting] = el.checked))),
    );
  document
    .querySelectorAll("[data-variant]")
    .forEach(
      (el) =>
        (el.onchange = () =>
          edit(
            () =>
              (p.enabled = el.checked
                ? [...p.enabled, el.dataset.variant]
                : p.enabled.filter((v) => v !== el.dataset.variant)),
          )),
    );
if ($("#brand"))
    $("#brand").onchange = (e) =>
      edit(() => (p.brand = e.target.value.trim() || "Sans titre"));
  if ($("#projects"))
    $("#projects").onchange = async (e) => {
      try {
        p = await validate(projects.find((x) => x.id === e.target.value));
        history.past = [];
        history.future = [];
        render();
      } catch (error) {
        notice(error.message);
      }
    };
  if ($("#font"))
    $("#font").onchange = async (e) => {
      try {
        font = opentype.parse(await e.target.files[0].arrayBuffer());
        render();
        notice("Police chargée. Réimportez le SVG contenant du texte.");
      } catch {
        notice("Police OTF / TTF illisible.");
      }
    };
  $("#project-file").onchange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 30e6) throw Error("Projet trop volumineux.");
      const imported = await validate(JSON.parse(await file.text()));
      imported.id = crypto.randomUUID();
      p = imported;
      view = hasArtwork(p) ? "compose" : "import";
      projects.push(p);
      history.past = [];
      history.future = [];
      render();
      save();
      notice("Projet importé.");
    } catch (error) {
      notice("Import refusé : " + error.message);
    }
  };
  if ($("#zoom")) $("#zoom").value = zoom;
  if ($("#zoom"))
    $("#zoom").onchange = (e) => {
      zoom = +e.target.value;
      drawStage();
    };
  document
    .querySelectorAll("[data-format]")
    .forEach(
      (el) =>
        (el.onchange = () =>
          edit(
            () =>
              (p.exports.formats = el.checked
                ? [...p.exports.formats, el.dataset.format]
                : p.exports.formats.filter((f) => f !== el.dataset.format)),
          )),
    );
  document.querySelectorAll("[data-export]").forEach(
    (el) =>
      (el.onchange = () => {
        if (!el.validity.valid) {
          notice("Valeur hors limites.");
          render();
          return;
        }
        edit(
          () =>
            (p.exports[el.dataset.export] =
              el.type === "checkbox"
                ? el.checked
                : el.type === "number" || el.dataset.export === "contrast"
                  ? +el.value
                  : el.value),
        );
      }),
  );
  document
    .querySelectorAll("[data-action]")
    .forEach((el) => (el.onclick = () => action(el.dataset.action)));
}
function action(name) {
  if (name === "focus") { focus = !focus; render(); return; }
  if (name === "measure") {
    cancelMeasurement?.();
    const variant = p.active;
    cancelMeasurement = startVisualMeasure({
      canvas: $("#canvas"), parts: layout(p).parts, snap: p.snap,
      previous: p.compositions[variant].visualMeasure?.label,
      finish: () => { cancelMeasurement = null; },
      commit: measure => edit(() => {
        p.compositions[variant].visualMeasure = measure;
        p.compositions[variant].clearMethod = "visual";
        p.compositions[variant].clearMultiplier = 1;
        inspector = "guides";
      }),
    });
    return;
  }
  if (name === "copy-rule") {
    const ids = [...document.querySelectorAll("[data-copy-rule]:checked")].map(el => el.dataset.copyRule);
    if (!ids.length) return;
    edit(() => ids.forEach(id => copyClearRule(p.compositions[p.active], p.compositions[id])));
    notice("Règle appliquée aux versions choisies.");
    return;
  }

  if (name === "undo" || name === "redo") {
    p = history[name](p);
    save();
    render();
  }
  if (name === "new") {
    view = "home";
    render();
    return;
  }
  if (name === "import-project") $("#project-file").click();
  if (name === "export-project")
    download(
      new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }),
      p.brand.replace(/[^a-z0-9]/gi, "-") + ".binksy",
    );
  if (name === "export") {
    try {
      runExport(deliveries(p, selectedItems(p)));
    } catch (error) {
      notice(error.message);
    }
  }
}
async function runExport(items) {
  if (busy) return;
  busy = true;
  const exportButtons = [...document.querySelectorAll('[data-action="export"], #export-kit')].map(el => ({ el, disabled: el.disabled }));
  exportButtons.forEach(({ el }) => el.disabled = true);
  const snapshot = clone(p);
  try {
    await exportFiles(snapshot, items, (message) => notice(message));
    notice("Export terminé. Votre téléchargement est prêt.");
  } catch (error) {
    notice(error.message);
  } finally {
    busy = false;
    exportButtons.forEach(({ el, disabled }) => { if (el.isConnected) el.disabled = disabled; });
  }
}
document.addEventListener("keydown", (e) => {
  if (
    (e.metaKey || e.ctrlKey) &&
    e.key.toLowerCase() === "z" &&
    !document.querySelector(".ai-dialog[open]") &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    action(e.shiftKey ? "redo" : "undo");
  }
});
render();
if (import.meta.env.PROD && "serviceWorker" in navigator)
  navigator.serviceWorker
    .register("/sw.js", { updateViaCache: "none" })
    .catch(() =>
      notice("Le cache hors ligne est indisponible dans ce navigateur."),
    );
function bindLanding() {
  document.querySelectorAll("[data-view]").forEach(
    (el) =>
      (el.onclick = (event) => {
        if (!handleViewLink(event, el)) return;
        view = el.dataset.view;
        render();
      }),
  );
  document.querySelectorAll("[data-mode]").forEach(
    (el) =>
      (el.onclick = () => {
        p = project("clearspace");
        projects.push(p);
        history.past = [];
        history.future = [];
        view = "import";
        render();
        save();
      }),
  );
  document.querySelectorAll("[data-open]").forEach(
    (el) =>
      (el.onclick = async () => {
        try {
          p = await validate(projects.find((p) => p.id === el.dataset.open));
          view = hasArtwork(p) ? "compose" : "import";
          history.past = [];
          history.future = [];
          render();
        } catch (e) {
          notice(e.message);
        }
      }),
  );
  document
    .querySelectorAll('[data-action="import-project"]')
    .forEach((el) => (el.onclick = () => $("#project-file").click()));
  $("#project-file").onchange = handleProjectImport;
}
async function handleProjectImport(e) {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 30e6) throw Error("Projet trop volumineux.");
    p = await validate(JSON.parse(await file.text()));
    p.id = crypto.randomUUID();
    projects.push(p);
    view = hasArtwork(p) ? "compose" : "import";
    history.past = [];
    history.future = [];
    render();
    save();
    notice("Projet importé.");
  } catch (e) {
    notice("Import refusé : " + e.message);
  }
}
function bindExtra() {
  if ($("#clear-method")) $("#clear-method").onchange = e => {
    if (e.target.value === "visual" && !p.compositions[p.active].visualMeasure) {
      e.target.value = p.compositions[p.active].clearMethod || "auto";
      action("measure");
    } else edit(() => p.compositions[p.active].clearMethod = e.target.value);
  };
  if ($("#measure-name")) $("#measure-name").onchange = e => edit(() => p.compositions[p.active].visualMeasure.label = e.target.value.trim());
  for (const [id, key] of [["visual-value", "visual"], ["clear-multiplier", "multiplier"]]) {
    if ($("#" + id)) $("#" + id).onchange = e => {
      if (!e.target.validity.valid || !Number.isFinite(+e.target.value) || +e.target.value <= 0) return;
      edit(() => { if (key === "visual") p.compositions[p.active].visualMeasure.value = +e.target.value; else p.compositions[p.active].clearMultiplier = +e.target.value; });
    };
  }

  document
    .querySelectorAll("[data-canvas]")
    .forEach(
      (el) => (el.onclick = () => edit(() => (p.canvas = el.dataset.canvas))),
    );
  if ($("#variant-name"))
    $("#variant-name").onchange = (e) =>
      edit(
        () =>
          (p.ready.find((v) => v.id === p.active).name =
            uniqueVariantName(p, e.target.value, p.active)),
      );
  if ($("#clear-reference"))
    $("#clear-reference").onchange = (e) =>
      edit(() => (p.compositions[p.active].clearRef = e.target.value));
  if ($("#clear-reference-value"))
    $("#clear-reference-value").onchange = (e) => {
      if (e.target.validity.valid && +e.target.value > 0)
        edit(
          () =>
            (p.compositions[p.active].references[
              p.compositions[p.active].clearRef
            ] = +e.target.value),
        );
      else notice("Indiquez une dimension strictement positive.");
    };
  document
    .querySelectorAll("[data-multiplier]")
    .forEach(
      (el) =>
        (el.onclick = () =>
          edit(
            () =>
              (p.compositions[p.active].clearMultiplier =
                +el.dataset.multiplier),
          )),
    );
  document.querySelectorAll("[data-board]").forEach(
    (el) =>
      (el.onclick = () => {
        try {
          download(
            new Blob([clearspaceSVG(p, p.active, el.dataset.board)], {
              type: "image/svg+xml",
            }),
            `${p.brand}-${variantName(p, p.active)}-clearspace-${el.dataset.board === "light" ? "clair" : "fonce"}.svg`,
          );
        } catch (e) {
          notice(e.message);
        }
      }),
  );
  if ($("#ready-files"))
    $("#ready-files").onchange = async (e) => {
      const files = [...e.target.files], owner = p;
      if (!files.length) return;
      try {
        const imported = [];
        for (const file of files)
          imported.push({
            id: "v-" + crypto.randomUUID(),
            name: file.name.replace(/\.svg$/i, ""),
            asset: await importSVG(await file.text(), file.name, font),
          });
        if (p !== owner) return;
        edit(() => {
          const paletteSize = p.colors.length;
          for (const variant of imported) {
            variant.name = uniqueVariantName(p, variant.name);
            p.ready.push(variant);
            p.enabled.push(variant.id);
            p.compositions[variant.id] = clone(
              project().compositions.horizontal,
            );
          }
          // A larger palette changes the rank of generated color combinations.
          if (p.colors.length !== paletteSize) resetColorChoices(p);
          p.active = imported[0]?.id || p.active;
        });
        notice(`${imported.length} variante(s) importée(s).`);
      } catch (e) {
        notice(e.message);
      }
    };
  document.querySelectorAll("[data-ready-name]").forEach(el => {
    el.onchange = () => edit(() => {
      const v = p.ready.find(v => v.id === el.dataset.readyName);
      v.name = uniqueVariantName(p, el.value, v.id);
    });
  });
  document.querySelectorAll("[data-replace-variant]").forEach(el => {
    el.onchange = async () => {
      const file = el.files[0];
      if (!file) return;
      const owner = p, id = el.dataset.replaceVariant;
      try {
        const asset = await importSVG(await file.text(), file.name, font);
        if (p !== owner || !p.ready.some(v => v.id === id)) return;
        edit(() => {
          const v = p.ready.find(v => v.id === id);
          // Reuse paint identities, never old node indices on a different SVG.
          for (const role of asset.roles) {
            const previous = v.asset.roles.find(r => r.id === role.id);
            if (previous) Object.assign(role, { name: previous.name, paint: previous.paint, locked: previous.locked });
          }
          v.asset = asset;
          resetColorChoices(p);
        });
      } catch (error) { notice(error.message); }
    };
  });
  document.querySelectorAll("[data-remove-variant]").forEach(
    (el) =>
      (el.onclick = () =>
        edit(() => {
          const id = el.dataset.removeVariant;
          p.ready = p.ready.filter((v) => v.id !== id);
          p.enabled = p.enabled.filter((v) => v !== id);
          delete p.compositions[id];
          if (p.active === id)
            p.active = p.ready[0]?.id || "horizontal";
          for (const key of ["selectedDescriptors", "colorSelection", "jpegExceptions", "jpegOverrides"])
            for (const entry of Object.keys(p[key] || {}))
              if (entry.startsWith(id + ":")) delete p[key][entry];
          p.excluded = p.excluded.filter(entry => !entry.startsWith(id + ":"));
          p.excludedFiles = (p.excludedFiles || []).filter(entry => !entry.startsWith(id + ":"));
        })),
  );
}
window.addEventListener("pagehide", () => {
  clearTimeout(saving);
  storeProjects(projects).catch(() => {});
});

function bindLanguage() {
  const header = document.querySelector("header");
  if (!header) return;
  header.insertAdjacentHTML(
    "beforeend",
    `<div class="language-switch" aria-label="Language"><button data-language="fr" aria-pressed="${language() === "fr"}">FR</button><button data-language="en" aria-pressed="${language() === "en"}">EN</button></div>`,
  );
  header.querySelectorAll("[data-language]").forEach(
    (el) =>
      (el.onclick = () => {
        setLanguage(el.dataset.language);
        render();
        if (projects.some((x) => x.id === p.id)) save();
      }),
  );
}
function bindProjectDeletion() {
  document
    .querySelectorAll("[data-open]")
    .forEach((el) =>
      el.insertAdjacentHTML(
        "afterend",
        `<button class="delete-project" data-delete-project="${el.dataset.open}" aria-label="${t("Supprimer le projet")}">${t("Supprimer")}</button>`,
      ),
    );
  const picker = document.querySelector("#projects");
  if (picker)
    picker.insertAdjacentHTML(
      "afterend",
      `<button class="delete-project" data-delete-project="${p.id}">${t("Supprimer le projet")}</button>`,
    );
  document.querySelectorAll("[data-delete-project]").forEach(
    (el) =>
      (el.onclick = () => {
        const id = el.dataset.deleteProject,
          target = projects.find((x) => x.id === id);
        if (!target) return;
        const dialog = document.createElement("dialog");
        dialog.setAttribute("aria-label", t("Supprimer le projet"));
        dialog.innerHTML = `<form method="dialog"><h2>${esc(t("Supprimer « {name} » ?", { name: target.brand }))}</h2><p>${t("Le projet enregistré sera supprimé de cet appareil. Les fichiers .binksy déjà exportés seront conservés.")}</p><div class="dialog-actions"><button value="cancel" autofocus>${t("Annuler")}</button><button class="destructive" value="delete">${t("Supprimer")}</button></div></form>`;
        document.body.append(dialog);
        dialog.showModal();
        dialog.onclose = async () => {
          if (dialog.returnValue === "delete") {
            clearTimeout(saving);
            const next = projects.filter((x) => x.id !== id);
            try {
              await storeProjects(next);
              projects = next;
              if (p.id === id) {
                p = project();
                view = "home";
                history.past = [];
                history.future = [];
              }
              render();
            } catch (error) {
              notice(error.message);
            }
          }
          dialog.remove();
        };
      }),
  );
}
