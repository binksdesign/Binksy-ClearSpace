import test from "node:test";
import assert from "node:assert/strict";
import {
  project,
  defaultComposition,
  layout,
  clearMeasure,
  composition,
  migrateComposition,
  variantIds,
  variantName,
  uniqueVariantName,
  slug,
  History,
  MULTIPLIERS,
} from "../src/model.js";

const asset = (w = 200, h = 100) => ({
  svg: "<svg></svg>",
  name: "logo.svg",
  box: { x: 0, y: 0, width: w, height: h },
  roles: [],
});

const fixture = () => {
  const p = project();
  p.ready = [
    { id: "v-a", name: "Horizontal", asset: asset(400, 100) },
    { id: "v-b", name: "Icône", asset: asset(80, 80) },
    { id: "v-c", name: "Vertical", asset: asset(100, 300) },
  ];
  p.active = "v-a";
  for (const v of p.ready) p.compositions[v.id] = defaultComposition();
  return p;
};

test("new projects are single-page clearspace", () => {
  const p = project();
  assert.deepEqual(variantIds(p), []);
  assert.equal(p.active, null);
  assert.equal("enabled" in p, false);
  assert.equal("clear" in p, false);
});

test("each variant keeps an independent clearspace state", () => {
  const p = fixture();
  p.compositions["v-a"] = { method: "height", multiplier: 1, measure: null, label: "" };
  p.compositions["v-b"] = { method: "width", multiplier: 0.5, measure: null, label: "" };
  p.compositions["v-c"] = { method: "visual", multiplier: 1.25, measure: 42, label: "Hauteur du A" };

  assert.equal(clearMeasure(p, "v-a").value, 100); // hauteur du horizontal
  assert.equal(clearMeasure(p, "v-a").space, 100);
  assert.equal(clearMeasure(p, "v-b").value, 80); // largeur de l'icône
  assert.equal(clearMeasure(p, "v-b").space, 40);
  assert.equal(clearMeasure(p, "v-c").value, 42);
  assert.equal(clearMeasure(p, "v-c").space, 52.5);
  assert.equal(clearMeasure(p, "v-c").label, "Hauteur du A");

  // changer la variante active ne modifie aucun réglage
  p.active = "v-b";
  assert.equal(clearMeasure(p, "v-a").space, 100);
  assert.equal(clearMeasure(p, "v-c").space, 52.5);
});

test("X methods read the real SVG dimensions", () => {
  const p = fixture();
  p.compositions["v-c"].method = "height";
  assert.equal(clearMeasure(p, "v-c").value, 300);
  p.compositions["v-c"].method = "width";
  assert.equal(clearMeasure(p, "v-c").value, 100);
});

test("multipliers scale the clear space", () => {
  const p = fixture();
  assert.deepEqual(MULTIPLIERS, [0.5, 1, 1.5, 2]);
  for (const [mult, space] of [[0.5, 50], [1, 100], [1.5, 150], [2, 200]]) {
    p.compositions["v-a"].multiplier = mult;
    assert.equal(clearMeasure(p, "v-a").space, space);
  }
  p.compositions["v-a"].multiplier = 0.75;
  assert.equal(clearMeasure(p, "v-a").space, 75);
});

test("visual method without value falls back to the short side", () => {
  const p = fixture();
  p.compositions["v-a"] = { method: "visual", multiplier: 1, measure: null, label: "" };
  assert.equal(clearMeasure(p, "v-a").value, 100);
  assert.equal(clearMeasure(p, "v-a").label, "Mesure visuelle");
});

test("layout exposes the ready asset untouched", () => {
  const l = layout(fixture(), "v-a");
  assert.equal(l.width, 400);
  assert.equal(l.height, 100);
  assert.equal(l.parts.length, 1);
  assert.equal(l.parts[0].key, "ready");
});

test("composition() returns a safe default for unknown variants", () => {
  assert.deepEqual(composition(project(), "missing"), defaultComposition());
});

test("variant names stay unique and readable", () => {
  const p = fixture();
  assert.equal(variantName(p, "v-a"), "Horizontal");
  assert.notEqual(uniqueVariantName(p, "Horizontal", "v-b"), "Horizontal");
  assert.equal(uniqueVariantName(p, "Horizontal", "v-a"), "Horizontal");
});

test("slug and history", () => {
  assert.equal(slug("Étude / Écho"), "Etude-Echo");
  let p = fixture();
  const h = new History();
  h.push(p);
  p.compositions["v-a"].multiplier = 2;
  p = h.undo(p);
  assert.equal(p.compositions["v-a"].multiplier, 1);
  p = h.redo(p);
  assert.equal(p.compositions["v-a"].multiplier, 2);
});

test("legacy LogoKit settings migrate without recomputing values", () => {
  const assetV = asset(200, 100);
  assert.deepEqual(
    migrateComposition({ clearMethod: "visual", visualMeasure: { value: 42, label: "M" }, clearMultiplier: 2 }, assetV),
    { method: "visual", multiplier: 2, measure: 42, label: "M" },
  );
  assert.deepEqual(
    migrateComposition({ clearMethod: "part", clearRef: "wordmarkHeight", references: { wordmarkHeight: 33 }, clearMultiplier: 1.5 }, assetV),
    { method: "visual", multiplier: 1.5, measure: 33, label: "Hauteur du logotype" },
  );
  // auto → dimension réelle la plus proche (ici largeur 200 > hauteur 100)
  assert.equal(migrateComposition({ clearMethod: "auto", clearMultiplier: 1 }, assetV).method, "height");
  assert.equal(migrateComposition({ clearMethod: "auto" }, { box: { width: 80, height: 80 } }).method, "width");
  assert.deepEqual(migrateComposition(null, assetV), defaultComposition());
  assert.equal(migrateComposition({ method: "width", multiplier: 99 }, assetV).multiplier, 5);
});
