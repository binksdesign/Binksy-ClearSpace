import { project, migrateComposition } from "./model.js";
import { importSVG } from "./svg.js";
import { restoreRoles } from "./paints.js";

const clamp = (n, min, max, fallback) =>
  Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;

export async function validate(data) {
  if (!data || typeof data !== "object" || typeof data.brand !== "string" || !Array.isArray(data.ready))
    throw Error("Format de projet non reconnu.");

  const result = project();
  result.id = typeof data.id === "string" ? data.id : result.id;
  result.brand = data.brand.slice(0, 100);
  result.canvas = data.canvas === "#000000" ? "#000000" : "#ffffff";
  result.clear = data.clear !== false;

  const seen = new Set();
  for (const item of data.ready) {
    const raw = item?.asset?.svg;
    if (typeof raw !== "string" || !item?.id || seen.has(item.id)) continue;
    if (!/^[\w-]{1,64}$/.test(item.id)) continue;
    seen.add(item.id);
    const asset = await importSVG(raw, String(item.asset.name || item.name || "logo.svg"));
    restoreRoles(asset, item.asset.roles);
    result.ready.push({ id: item.id, name: String(item.name || "Logo").slice(0, 100), asset });
    result.compositions[item.id] = migrateComposition(
      data.compositions?.[item.id],
      asset,
    );
  }

  const ids = result.ready.map((r) => r.id);
  result.active = ids.includes(data.active) ? data.active : ids[0] || null;
  result.enabled = Array.isArray(data.enabled)
    ? ids.filter((id) => data.enabled.includes(id))
    : [...ids];

  const e = data.exports || {};
  result.exports.formats = Array.isArray(e.formats)
    ? [...new Set(e.formats.filter((f) => ["svg", "png", "jpeg", "pdf"].includes(f)))]
    : ["svg", "png", "jpeg", "pdf"];
  if (!result.exports.formats.length)
    result.exports.formats = ["svg", "png", "jpeg", "pdf"];
  result.exports.width = clamp(e.width, 256, 8192, 3000);
  result.exports.dpi = Math.round(clamp(e.dpi, 72, 1200, 300));

  return result;
}
