import { layout } from "./model.js";

// Clearspace only knows the original colors of each variant: a single,
// indexable item per variant. No color combinations are ever generated.
export const CATEGORIES = ["original", "mono", "multi", "gradient"];
export function catalog(p, variant, category) {
  if (category !== "original" || !layout(p, variant).parts.length)
    return { size: 0n, at: () => null };
  return {
    size: 1n,
    at: (index) =>
      BigInt(index) === 0n
        ? {
            id: variant + ":original",
            variant,
            category: "original",
            color: { id: "original", name: "Original", hex: null },
            recommended: true,
          }
        : null,
  };
}
export function selectedCount(p, variant, category) {
  if (category !== "original") return 0n;
  const c = catalog(p, variant, category),
    s = p.colorSelection || {},
    rule = s[variant + ":" + category] ?? true;
  let count = rule ? c.size : 0n;
  // Only persisted single-item choices are counted; source changes clear these choices in the UI.
  for (const [id, value] of Object.entries(s))
    if (
      id.startsWith(variant + ":") &&
      id !== variant + ":" + category &&
      !CATEGORIES.some((k) => id === variant + ":" + k)
    ) {
      const kind = id.endsWith(":original") ? "original" : "mono";
      if (kind === category && value !== rule) count += value ? 1n : -1n;
    }
  if (rule)
    for (const id of new Set(p.excluded || [])) {
      if (
        !id.startsWith(variant + ":") ||
        id.includes(":jpeg:") ||
        Object.hasOwn(s, id)
      )
        continue;
      const kind = id.endsWith(":original") ? "original" : "mono";
      if (kind === category) count--;
    }
  return count < 0n ? 0n : count > c.size ? c.size : count;
}
export function selectedItems(p, limit = 10000) {
  const result = [];
  for (const variant of p.enabled)
    for (const category of CATEGORIES) {
      const c = catalog(p, variant, category),
        count = selectedCount(p, variant, category);
      if (count > BigInt(limit - result.length))
        throw Error(
          "Sélection trop étendue : réduisez les combinaisons avant de préparer les fichiers.",
        );
      if (!count) continue;
      const rule = p.colorSelection?.[variant + ":" + category] ?? true;
      if (!rule && c.size > 1000n) {
        // Resolve sparse selection using stored descriptors; never scan the Cartesian product.
        for (const item of Object.values(p.selectedDescriptors || {}))
          if (
            item.variant === variant &&
            item.category === category &&
            (p.colorSelection?.[item.id] ?? !p.excluded.includes(item.id))
          )
            result.push(item);
      } else
        for (let i = 0n; i < c.size; i++) {
          const item = c.at(i);
          if (p.colorSelection?.[item.id] ?? !p.excluded.includes(item.id))
            result.push(item);
        }
    }
  return result;
}
export function deliveries(p, items) {
  return items.filter((i) => i.color.id === "original");
}
