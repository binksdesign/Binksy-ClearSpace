import test from "node:test";
import assert from "node:assert/strict";
import {
  project,
  layout,
  clearMeasure,
  variantIds,
  variantName,
  uniqueVariantName,
  colors,
  slug,
  History,
  CLEAR_REFS,
} from "../src/model.js";

const asset = (w = 200, h = 100) => ({
  svg: "<svg></svg>",
  name: "logo.svg",
  box: { x: 0, y: 0, width: w, height: h },
  roles: [],
});
const fixture = () => {
  const p = project();
  p.ready = [{ id: "v-1", name: "Logo", asset: asset() }];
  p.active = "v-1";
  p.enabled = ["v-1"];
  p.compositions["v-1"] = { ...project().compositions.horizontal };
  return p;
};

test("new projects are clearspace-only", () => {
  const p = project();
  assert.equal(p.mode, "clearspace");
  assert.deepEqual(p.exports.formats, ["svg", "png", "pdf"]);
  assert.equal(p.brandGuideline.enabled, false);
  assert.deepEqual(variantIds(p), []);
});

test("layout exposes the ready asset untouched", () => {
  const p = fixture();
  const l = layout(p);
  assert.equal(l.width, 200);
  assert.equal(l.height, 100);
  assert.equal(l.X, 50);
  assert.equal(l.parts.length, 1);
  assert.equal(l.parts[0].key, "ready");
});

test("auto X uses the short side", () => {
  const p = fixture();
  p.compositions["v-1"].clearMethod = "auto";
  const m = clearMeasure(p);
  assert.equal(m.value, 100);
  assert.equal(m.multiplier, 0.5);
  assert.equal(m.space, 50);
});

test("multipliers scale the space", () => {
  const p = fixture();
  p.compositions["v-1"].clearMethod = "auto";
  for (const [mult, space] of [[0.5, 50], [1, 100], [1.5, 150], [2, 200]]) {
    p.compositions["v-1"].clearMultiplier = mult;
    assert.equal(clearMeasure(p).space, space);
  }
});

test("manual reference and visual measure", () => {
  const p = fixture();
  const c = p.compositions["v-1"];
  c.clearMethod = "part";
  c.clearRef = "wordmarkHeight";
  c.references = { wordmarkHeight: 40 };
  assert.equal(clearMeasure(p).value, 40);
  assert.equal(clearMeasure(p).label, CLEAR_REFS.wordmarkHeight);
  c.clearMethod = "visual";
  c.visualMeasure = { value: 25, label: "M" };
  assert.equal(clearMeasure(p).value, 25);
  assert.equal(clearMeasure(p).label, "M");
});

test("variant names stay unique and readable", () => {
  const p = fixture();
  assert.equal(variantName(p, "v-1"), "Logo");
  assert.equal(uniqueVariantName(p, "Logo", "v-1"), "Logo");
  p.ready.push({ id: "v-2", name: "Logo", asset: asset() });
  assert.notEqual(uniqueVariantName(p, "Logo", "v-2"), "Logo");
});

test("colors stay original-only", () => {
  assert.deepEqual(colors(fixture()), [
    { id: "original", name: "Original", hex: null },
  ]);
});

test("slug and history", () => {
  assert.equal(slug("Étude / Écho"), "Etude-Echo");
  let p = fixture();
  const h = new History();
  h.push(p);
  p.compositions["v-1"].clearMultiplier = 2;
  p = h.undo(p);
  assert.equal(p.compositions["v-1"].clearMultiplier, 0.5);
  p = h.redo(p);
  assert.equal(p.compositions["v-1"].clearMultiplier, 2);
});
