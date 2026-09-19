// Paint targets use document-order element indices, stable across .binksy imports.
export function hexColor(value) {
  if (/^#[\da-f]{6}$/i.test(value || "")) return value.toLowerCase();
  const m = (value || "").match(
    /^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/,
  );
  return m
    ? "#" +
        m
          .slice(1)
          .map((n) => Math.round(+n).toString(16).padStart(2, "0"))
          .join("")
    : null;
}
export function detectRoles(root) {
  const groups = new Map();
  [root, ...root.querySelectorAll("*")].forEach((el, index) => {
    if (
      el.closest("clipPath,mask,pattern,filter") ||
      el.getAttribute("display") === "none"
    )
      return;
    const props =
      el.localName === "stop"
        ? ["stop-color"]
        : /^(path|rect|circle|ellipse|polygon|polyline|line|use)$/.test(
              el.localName,
            )
          ? ["fill", "stroke"]
          : [];
    for (const prop of props) {
      const paint = hexColor(el.getAttribute(prop));
      if (!paint) continue;
      if (!groups.has(paint))
        groups.set(paint, {
          id: "paint-" + paint.slice(1),
          name: paint.toUpperCase(),
          paint,
          locked: false,
          targets: [],
        });
      groups.get(paint).targets.push({ index, prop });
    }
  });
  return [...groups.values()];
}
export function restoreRoles(asset, saved) {
  if (!Array.isArray(saved)) return;
  const available = new Map(
    asset.roles.flatMap((r) =>
      r.targets.map((t) => [t.index + ":" + t.prop, t]),
    ),
  );
  const used = new Set(),
    roles = [];
  for (const r of saved) {
    if (!/^[\w-]+$/.test(r.id) || roles.some((x) => x.id === r.id)) continue;
    const targets = (r.targets || []).filter((t) => {
      const key = t.index + ":" + t.prop;
      if (!available.has(key) || used.has(key)) return false;
      used.add(key);
      return true;
    });
    if (targets.length)
      roles.push({
        id: r.id,
        name: String(r.name || r.id).slice(0, 100),
        paint: hexColor(r.paint) || "#000000",
        locked: r.locked === true,
        logicalGroup: r.logicalGroup === true,
        targets,
      });
  }
  for (const r of asset.roles) {
    const targets = r.targets.filter((t) => !used.has(t.index + ":" + t.prop));
    if (targets.length)
      roles.push({
        ...r,
        id: roles.some((x) => x.id === r.id) ? r.id + "-rest" : r.id,
        targets,
      });
  }
  asset.roles = roles;
}
