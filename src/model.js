import { t } from "./i18n.js";
// Brand Guideline subsystem removed: projects always carry a disabled guide
// so legacy files stay readable without the guideline engine.
const emptyGuide = () => ({ enabled: false, setup: false, pages: [] });
export const VARIANTS = ["horizontal", "vertical", "icon", "wordmark"];
export const LABELS = {
  horizontal: "Horizontal",
  vertical: "Vertical",
  icon: "Icône",
  wordmark: "Logotype",
};
export const clone = (x) => structuredClone(x);
export function project() {
  return {
    version: 5,
    brandGuideline: emptyGuide(),
    gradients: [],
    colorSelection: {},
    jpegGlobal: {},
    mode: "clearspace",
    ready: [],
    canvas: "#ffffff",
    jpegOverrides: {},
    jpegExceptions: {},
    id: crypto.randomUUID(),
    brand: t("Sans titre"),
    active: "horizontal",
    enabled: [],
    grid: true,
    snap: true,
    clear: true,
    colors: [],
    compositions: Object.fromEntries(
      VARIANTS.map((v) => [
        v,
        {
          iconSize: 2.5,
          wordSize: 1,
          gap: 1,
          align: "center",
          center: "real",
          iconX: 0,
          iconY: 0,
          wordmarkX: 0,
          wordmarkY: 0,
          clear: 1,
          clearRef: "wordmarkHeight",
          clearMultiplier: 0.5,
          references: {},
          minPrint: { horizontal: 30, vertical: 25, icon: 8, wordmark: 22 }[v],
          minDigital: { horizontal: 144, vertical: 120, icon: 32, wordmark: 110 }[v],
        },
      ]),
    ),
    excluded: [],
    naming: {
      pattern: "{brand}-{variant}-{color}-{background}",
      separator: "-",
      uppercase: false,
    },
    exports: {
      formats: ["svg", "png", "pdf"],
      width: 3000,
      height: 3000,
      dpi: 300,
      jpegMargin: 0.5,
      contrast: 3,
      clearspace: true,
      destinations: ["WEB", "PRINT"],
      printBitmaps: false,
      rasterFormats: ["web-3000"],
      customFormats: [],
      framing: {},
    },
  };
}
export function layout(p, v = p.active) {
  const variant = p.ready.find((r) => r.id === v);
  if (!variant) return { X: 50, parts: [], x: 0, y: 0, width: 1, height: 1 };
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
export function colors(p) {
  return [{ id: "original", name: "Original", hex: null }];
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
  return [...(p.ready || []).map((r) => r.id)];
}
export function isReadyVariant(p, id = p.active) {
  return !!p.ready?.some((r) => r.id === id);
}
export function variantName(p, id) {
  return p.ready?.find((r) => r.id === id)?.name || t(LABELS[id] || id);
}
// Names are also export path components: avoid collisions after slug normalization.
export function uniqueVariantName(p, name, exceptId) {
  const base = String(name).trim().slice(0, 90) || t("Variante");
  const used = new Set(variantIds(p).filter(id => id !== exceptId).map(id => slug(variantName(p, id)).toLowerCase()));
  let candidate = base, n = 2;
  while (used.has(slug(candidate).toLowerCase())) candidate = `${base} ${n++}`;
  return candidate;
}
export const CLEAR_REFS = {
  brandmarkWidth: "Largeur du brandmark",
  brandmarkHeight: "Hauteur du brandmark",
  wordmarkHeight: "Hauteur du logotype",
};
export function clearMeasure(p, v = p.active) {
  const c = p.compositions[v] || project().compositions.horizontal,
    l = layout(p, v);
  let value;
  if (c.clearMethod === "visual") value = c.visualMeasure?.value;
  else if (c.clearMethod === "auto") value = Math.min(l.width, l.height);
  else value = c.references?.[c.clearRef] || Math.min(l.width, l.height);
  return {
    reference: c.clearRef,
    label: c.clearMethod === "visual" ? (c.visualMeasure?.label || t("Mesure dessinée")) : c.clearMethod === "auto" ? t("Petit côté du logo") : t(CLEAR_REFS[c.clearRef]),
    value: value || (l.parts.length ? Math.min(l.width, l.height) : 0),
    multiplier: c.clearMultiplier,
    space:
      (value || (l.parts.length ? Math.min(l.width, l.height) : 0)) *
      c.clearMultiplier,
  };
}
