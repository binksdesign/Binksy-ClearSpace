import { t } from "./i18n.js";

// Binksy ClearSpace — état du projet.
// Un projet contient plusieurs variantes SVG indépendantes. Chaque variante
// garde son propre réglage de zone de sécurité dans `compositions[id]` :
//   { method: 'height' | 'width' | 'visual', multiplier, measure, label }
export const CLEAR_METHODS = ["height", "width", "visual"];
export const MULTIPLIERS = [0.5, 1, 1.5, 2];

export const clone = (x) => structuredClone(x);

export function defaultComposition() {
  return { method: "height", multiplier: 1, measure: null, label: "" };
}

export function project() {
  return {
    version: 7,
    id: crypto.randomUUID(),
    brand: t("Sans titre"),
    ready: [],
    active: null,
    canvas: "#ffffff",
    theme: "light",
    compositions: {},
    exports: {
      width: 3000,
      dpi: 300,
    },
  };
}

export function layout(p, v = p.active) {
  const variant = p.ready.find((r) => r.id === v);
  if (!variant)
    return { X: 50, parts: [], x: 0, y: 0, width: 1, height: 1 };
  const asset = variant.asset;
  return {
    X: asset.box.height / 2,
    parts: [
      {
        key: "ready",
        asset,
        x: 0,
        y: 0,
        w: asset.box.width,
        h: asset.box.height,
      },
    ],
    x: 0,
    y: 0,
    width: asset.box.width,
    height: asset.box.height,
  };
}

export function slug(s, separator = "-") {
  return (
    String(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, separator)
      .replace(/^[-_.]+|[-_.]+$/g, "") || "logo"
  );
}

export class History {
  past = [];
  future = [];
  push(p) {
    this.past.push(clone(p));
    if (this.past.length > 60) this.past.shift();
    this.future = [];
  }
  undo(p) {
    if (!this.past.length) return p;
    this.future.push(clone(p));
    return this.past.pop();
  }
  redo(p) {
    if (!this.future.length) return p;
    this.past.push(clone(p));
    return this.future.pop();
  }
}

export function variantIds(p) {
  return (p.ready || []).map((r) => r.id);
}

export function isReadyVariant(p, id = p.active) {
  return !!p.ready?.some((r) => r.id === id);
}

export function variantName(p, id) {
  return p.ready?.find((r) => r.id === id)?.name || t("Variante");
}

// Les noms servent aussi de dossiers d'export : éviter les collisions une fois
// normalisés par slug().
export function uniqueVariantName(p, name, exceptId) {
  const base = String(name).trim().slice(0, 90) || t("Variante");
  const used = new Set(
    variantIds(p)
      .filter((id) => id !== exceptId)
      .map((id) => slug(variantName(p, id)).toLowerCase()),
  );
  let candidate = base,
    n = 2;
  while (used.has(slug(candidate).toLowerCase())) candidate = `${base} ${n++}`;
  return candidate;
}

export function composition(p, v = p.active) {
  return p.compositions?.[v] || defaultComposition();
}

export function methodLabel(method, label) {
  if (method === "visual") return (label || "").trim() || t("Mesure visuelle");
  if (method === "width") return t("Largeur du logo");
  return t("Hauteur du logo");
}

// X = mesure de référence ; zone = X × multiplicateur.
export function clearMeasure(p, v = p.active) {
  const l = layout(p, v);
  const c = composition(p, v);
  const fallback = l.parts.length ? Math.min(l.width, l.height) : 0;
  const value =
    c.method === "visual"
      ? Number(c.measure) || 0
      : c.method === "width"
        ? l.width
        : l.height;
  const base = value || fallback;
  return {
    method: c.method,
    label: methodLabel(c.method, c.label),
    value: base,
    multiplier: c.multiplier,
    space: base * c.multiplier,
  };
}

const LEGACY_REF_LABELS = {
  brandmarkWidth: "Largeur du brandmark",
  brandmarkHeight: "Hauteur du brandmark",
  wordmarkHeight: "Hauteur du logotype",
};

const clamp = (n, min, max, fallback) =>
  Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;

// Migre un ancien réglage LogoKit vers les trois méthodes ClearSpace.
// Les valeurs numériques existantes sont préservées, jamais recalculées.
export function migrateComposition(old, asset) {
  const c = defaultComposition();
  if (!old || typeof old !== "object") return c;
  if (CLEAR_METHODS.includes(old.method)) {
    c.method = old.method;
    if (Number.isFinite(old.measure) && old.measure > 0)
      c.measure = Math.min(1e6, old.measure);
    if (typeof old.label === "string") c.label = old.label.slice(0, 160);
  } else if (
    old.clearMethod === "visual" &&
    Number.isFinite(old.visualMeasure?.value) &&
    old.visualMeasure.value > 0
  ) {
    c.method = "visual";
    c.measure = Math.min(1e6, old.visualMeasure.value);
    c.label = String(old.visualMeasure.label || "").slice(0, 160);
  } else if (
    old.clearMethod === "part" &&
    Number.isFinite(old.references?.[old.clearRef]) &&
    old.references[old.clearRef] > 0
  ) {
    c.method = "visual";
    c.measure = Math.min(1e6, old.references[old.clearRef]);
    c.label = LEGACY_REF_LABELS[old.clearRef] || "";
  } else if (asset) {
    c.method = asset.box.width <= asset.box.height ? "width" : "height";
  }
  c.multiplier = clamp(old.multiplier ?? old.clearMultiplier, 0.05, 5, 1);
  return c;
}
