import { slug, variantName } from "./model.js";

// Tous les formats sont produits à chaque export ; l'utilisateur n'a rien à
// choisir. Une entrée par variante × format × ton (clair/sombre).
export const EXPORT_FORMATS = ["svg", "png", "jpeg", "pdf"];

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

// Toutes les variantes importées sont exportées, sans sélection.
export function exportVariants(p) {
  return [...(p.ready || [])];
}

export function exportPlan(p) {
  const root = slug(p.brand).toUpperCase() + " CLEARSPACE";
  const jobs = [];
  for (const variant of exportVariants(p)) {
    const folder = safeFolder(variantName(p, variant.id));
    const base = `${slug(p.brand)}-${slug(variantName(p, variant.id))}-clearspace`;
    for (const format of EXPORT_FORMATS)
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
