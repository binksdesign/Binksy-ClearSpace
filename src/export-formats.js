import { slug, variantName } from "./model.js";

// Plan d'export pur (testable hors navigateur) : une entrée par variante ×
// format × ton (clair/sombre). Les fichiers sont toujours regroupés en ZIP.
export function safeFolder(name) {
  return (
    String(name)
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[.-]+|[.-]+$/g, "")
      .trim() || "Logo"
  );
}

export function enabledVariants(p) {
  return (p.ready || []).filter((v) => p.enabled.includes(v.id));
}

export function exportPlan(p) {
  const root = slug(p.brand).toUpperCase() + " CLEARSPACE";
  const formats = p.exports.formats.length
    ? p.exports.formats
    : ["svg", "png", "jpeg", "pdf"];
  const jobs = [];
  for (const variant of enabledVariants(p)) {
    const folder = safeFolder(variantName(p, variant.id));
    const base = `${slug(p.brand)}-${slug(variantName(p, variant.id))}-clearspace`;
    for (const format of formats)
      for (const tone of ["light", "dark"]) {
        const suffix = tone === "light" ? "clair" : "fonce";
        jobs.push({
          variant: variant.id,
          tone,
          format,
          key: `${variant.id}:${tone}:${format}`,
          path: `${root}/${folder}/${format.toUpperCase()}/${base}-${suffix}.${format}`,
        });
      }
  }
  return jobs;
}
