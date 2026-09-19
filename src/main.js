import "./tooltips.js";
import "./style.css";
import "./binks-lab.css";
import "./binks-lab.js";
import {
  readProject,
  readLegacyProjects,
  storeProject,
  markMigrated,
} from "./project-storage.js";
import { startVisualMeasure } from "./visual-measure.js";
import { workspace } from "./workspace.js";
import { t, language, setLanguage, translateDOM } from "./i18n.js";
import { clearGuides } from "./clearspace.js";
import { validate } from "./project.js";
import {
  project,
  defaultComposition,
  composition,
  clearMeasure,
  layout,
  History,
  clone,
  variantIds,
  variantName,
  uniqueVariantName,
  slug,
  MULTIPLIERS,
} from "./model.js";
import { importSVG, assetContent } from "./svg.js";
import { exportFiles } from "./export.js";

const $ = (s) => document.querySelector(s);
const history = new History();
let p = project();
let saving,
  busy = false,
  cancelMeasurement = null,
  zoom = 1;

// ---- démarrage : projet local, migration LogoKit unique, sinon nouveau ----
function applyTheme() {
  document.documentElement.dataset.theme = p.theme === "dark" ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", p.theme === "dark" ? "#191919" : "#efefef");
}

function preferredTheme() {
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

async function boot() {
  try {
    const stored = await readProject();
    if (stored) {
      p = await validate(stored);
      applyTheme();
      return;
    }
    const legacy = await readLegacyProjects();
    if (legacy?.length) {
      const migrated = await migrateLegacy(legacy);
      if (migrated) {
        p = migrated;
        markMigrated();
        applyTheme();
        await storeProject(p);
        queueMicrotask(() => notice(t("Projets LogoKit importés dans Binksy ClearSpace.")));
        return;
      }
    }
    markMigrated();
    p.theme = preferredTheme();
    applyTheme();
  } catch {
    queueMicrotask(() =>
      notice(t("Sauvegarde locale illisible. Importez vos SVG à nouveau.")),
    );
  }
}

// Fusionne toutes les variantes des anciens projets LogoKit en un seul projet.
async function migrateLegacy(projects) {
  const ready = [];
  const compositions = {};
  for (const item of projects) {
    let validated;
    try {
      validated = await validate({
        version: item.version,
        brand: item.brand,
        ready: item.ready || [],
        active: item.active,
        canvas: item.canvas,
        compositions: item.compositions,
        exports: item.exports,
      });
    } catch {
      continue;
    }
    for (const v of validated.ready) {
      if (ready.some((x) => x.id === v.id)) v.id = "v-" + crypto.randomUUID();
      ready.push(v);
      compositions[v.id] = validated.compositions[v.id];
    }
  }
  if (!ready.length) return null;
  const result = project();
  result.brand = projects[0]?.brand || t("Sans titre");
  result.ready = ready;
  result.compositions = compositions;
  result.active = ready[0].id;
  return result;
}

// ---- persistance ----
function save() {
  clearTimeout(saving);
  const el = $("#save-state");
  if (el) el.textContent = t("Enregistrement…");
  saving = setTimeout(async () => {
    const task = saving;
    try {
      await storeProject(p);
      if (saving === task && $("#save-state"))
        $("#save-state").textContent = t("Enregistré sur cet appareil");
    } catch {
      if ($("#save-state"))
        $("#save-state").textContent = t("Sauvegarde impossible");
      notice(t("Stockage local plein ou indisponible."));
    }
  }, 300);
}

function edit(fn) {
  history.push(p);
  fn();
  save();
  render();
}

function notice(message) {
  const n = $("#notice");
  if (!n) return;
  n.textContent = message;
  n.hidden = false;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => (n.hidden = true), 8000);
}

// ---- rendu ----
function render() {
  document.title = "Binksy ClearSpace — Zone de sécurité du logo";
  applyTheme();
  cancelMeasurement?.();
  cancelMeasurement = null;
  const scroll = { left: $(".left")?.scrollTop || 0, right: $(".right")?.scrollTop || 0 };
  $("#app").innerHTML =
    workspace(p, { history, busy }) +
    `<div id="notice" role="status" hidden></div>`;
  bind();
  bindLanguage();
  if ($(".left")) $(".left").scrollTop = scroll.left;
  if ($(".right")) $(".right").scrollTop = scroll.right;
  if ($("#save-state") && saving) $("#save-state").textContent = t("Enregistrement…");
  drawStage();
  translateDOM();
}

function drawStage() {
  const stage = $("#stage");
  if (!stage) return;
  if (!p.ready.length) {
    stage.innerHTML = `<div class="empty import-empty" data-drop><span class="empty-mark">${"＋"}</span><h2>${t("Déposez vos SVG")}</h2><p>${t("Horizontal, vertical, icône, logotype… chaque fichier devient une variante indépendante.")}</p><label class="file-button primary">${t("Choisir des fichiers SVG")}<input id="stage-files" type="file" accept=".svg,image/svg+xml" multiple hidden></label></div>`;
    const input = $("#stage-files");
    if (input) input.onchange = () => importFiles(input.files);
    bindDrop(stage);
    return;
  }
  const l = layout(p);
  const m = clearMeasure(p);
  const margin = Math.max(l.X * 1.5, m.space + 25);
  const w = (l.width + margin * 2) / zoom;
  const h = (l.height + margin * 2) / zoom;
  const x = l.x + l.width / 2 - w / 2;
  const y = l.y + l.height / 2 - h / 2;
  stage.innerHTML = `<svg id="canvas" xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}"><g id="clear-guides">${clearGuides(l, m.space, p.canvas === "#000000" ? "light" : "dark")}</g>${l.parts.map((q) => `<g transform="translate(${q.x} ${q.y})"><svg width="${q.w}" height="${q.h}" viewBox="${q.asset.box.x} ${q.asset.box.y} ${q.asset.box.width} ${q.asset.box.height}" overflow="visible">${assetContent({ ...q.asset, roles: [] }, null, "stage-" + q.key)}</svg></g>`).join("")}</svg>`;
  stage.style.background = p.canvas;
  stage.classList.toggle("dark-canvas", p.canvas === "#000000");
  translateDOM(stage);
}

function bindDrop(el) {
  el.ondragover = (e) => {
    e.preventDefault();
    el.classList.add("dragover");
  };
  el.ondragleave = () => el.classList.remove("dragover");
  el.ondrop = (e) => {
    e.preventDefault();
    el.classList.remove("dragover");
    importFiles(e.dataTransfer.files);
  };
}

async function importFiles(fileList) {
  const files = [...(fileList || [])].filter((f) => f);
  if (!files.length) return;
  try {
    const imported = [];
    for (const file of files) {
      if (file.size > 3e6) throw Error(t("Fichier trop volumineux."));
      const asset = await importSVG(await file.text(), file.name);
      imported.push({
        id: "v-" + crypto.randomUUID(),
        name: uniqueVariantName(p, file.name.replace(/\.svg$/i, "")),
        asset,
      });
    }
    edit(() => {
      for (const variant of imported) {
        p.ready.push(variant);
        p.compositions[variant.id] = defaultComposition();
      }
      p.active = imported[0].id;
    });
    notice(`${imported.length} ${imported.length > 1 ? t("variantes importées") : t("variante importée")}.`);
  } catch (error) {
    notice(error.message);
  }
}

// ---- bindings ----
function bind() {
  document.querySelectorAll("[data-action]").forEach(
    (el) => (el.onclick = () => action(el.dataset.action)),
  );

  document.querySelectorAll("[data-active]").forEach(
    (el) =>
      (el.onclick = () => {
        p.active = el.dataset.active;
        save();
        render();
      }),
  );

  const files = $("#ready-files");
  if (files) {
    files.onchange = () => {
      importFiles(files.files);
      files.value = "";
    };
  }
  bindDrop($("#stage"));

  document.querySelectorAll("[data-ready-name]").forEach((el) => {
    el.onchange = () =>
      edit(() => {
        const v = p.ready.find((x) => x.id === el.dataset.readyName);
        if (v) v.name = uniqueVariantName(p, el.value, v.id);
      });
  });

  document.querySelectorAll("[data-replace-variant]").forEach((el) => {
    el.onchange = async () => {
      const file = el.files[0];
      if (!file) return;
      const id = el.dataset.replaceVariant;
      try {
        const asset = await importSVG(await file.text(), file.name);
        edit(() => {
          const v = p.ready.find((x) => x.id === id);
          if (v) v.asset = asset;
        });
      } catch (error) {
        notice(error.message);
      }
    };
  });

  document.querySelectorAll("[data-remove-variant]").forEach(
    (el) =>
      (el.onclick = () =>
        edit(() => {
          const id = el.dataset.removeVariant;
          p.ready = p.ready.filter((v) => v.id !== id);
          delete p.compositions[id];
          if (p.active === id) p.active = p.ready[0]?.id || null;
        })),
  );

  document.querySelectorAll("[data-method]").forEach(
    (el) =>
      (el.onclick = () => {
        const method = el.dataset.method;
        edit(() => {
          const c = (p.compositions[p.active] ||= defaultComposition());
          c.method = method;
          if (method !== "visual") c.measure = null;
        });
      }),
  );

  const name = $("#measure-name");
  if (name)
    name.onchange = () =>
      edit(() => {
        (p.compositions[p.active] ||= defaultComposition()).label = name.value.trim();
      });

  document.querySelectorAll("[data-multiplier]").forEach(
    (el) =>
      (el.onclick = () =>
        edit(() => {
          (p.compositions[p.active] ||= defaultComposition()).multiplier =
            Number(el.dataset.multiplier);
        })),
  );
  const custom = $("#clear-multiplier");
  if (custom)
    custom.onchange = () => {
      const v = Number(custom.value);
      if (!(v >= 0.05 && v <= 5)) {
        notice(t("Multiplicateur entre 0,05 et 5."));
        render();
        return;
      }
      edit(() => {
        (p.compositions[p.active] ||= defaultComposition()).multiplier = v;
      });
    };

  const themeToggle = $("[data-theme-toggle]");
  if (themeToggle)
    themeToggle.onclick = () =>
      edit(() => (p.theme = p.theme === "dark" ? "light" : "dark"));
  document.querySelectorAll("[data-canvas]").forEach(
    (el) => (el.onclick = () => edit(() => (p.canvas = el.dataset.canvas))),
  );
}

function action(name) {
  if (name === "undo" || name === "redo") {
    p = history[name](p);
    save();
    render();
    return;
  }
  if (name === "measure") {
    cancelMeasurement?.();
    const canvas = $("#canvas");
    if (!canvas) return;
    const variant = p.active;
    cancelMeasurement = startVisualMeasure({
      canvas,
      previous: composition(p, variant).label,
      finish: () => {
        cancelMeasurement = null;
      },
      commit: (measure) =>
        edit(() => {
          const c = (p.compositions[variant] ||= defaultComposition());
          c.method = "visual";
          c.measure = measure.value;
          if (measure.label) c.label = measure.label;
        }),
    });
    return;
  }
  if (name === "export") runExport();
}

async function runExport() {
  if (busy) return;
  busy = true;
  const button = $('[data-action="export"]');
  if (button) button.disabled = true;
  try {
    await exportFiles(clone(p), (message) => notice(message));
    notice(t("Export terminé. Votre ZIP est prêt."));
  } catch (error) {
    notice(error.message);
  } finally {
    busy = false;
    if (button?.isConnected) button.disabled = false;
  }
}

function bindLanguage() {
  const header = $("header");
  if (!header) return;
  header.insertAdjacentHTML(
    "beforeend",
    `<div class="language-switch" aria-label="Language"><button data-language="fr" aria-pressed="${language() === "fr"}">FR</button><button data-language="en" aria-pressed="${language() === "en"}">EN</button></div>`,
  );
  header.querySelectorAll("[data-language]").forEach(
    (el) =>
      (el.onclick = () => {
        setLanguage(el.dataset.language);
        save();
        render();
      }),
  );
}

document.addEventListener("keydown", (e) => {
  if (
    (e.metaKey || e.ctrlKey) &&
    e.key.toLowerCase() === "z" &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    action(e.shiftKey ? "redo" : "undo");
  }
});

window.addEventListener("pagehide", () => {
  clearTimeout(saving);
  storeProject(p).catch(() => {});
});

await boot();
render();
if (import.meta.env.PROD && "serviceWorker" in navigator)
  navigator.serviceWorker
    .register("/sw.js", { updateViaCache: "none" })
    .catch(() => notice(t("Le cache hors ligne est indisponible.")));
