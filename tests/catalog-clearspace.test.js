import test from "node:test";
import assert from "node:assert/strict";
import {
  catalog,
  CATEGORIES,
  selectedCount,
  selectedItems,
  deliveries,
} from "../src/catalog.js";
import { project } from "../src/model.js";

const asset = () => ({
  svg: "<svg></svg>",
  name: "logo.svg",
  box: { x: 0, y: 0, width: 200, height: 100 },
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

test("only the original item exists per variant", () => {
  const p = fixture();
  assert.deepEqual(CATEGORIES, ["original", "mono", "multi", "gradient"]);
  const c = catalog(p, "v-1", "original");
  assert.equal(c.size, 1n);
  const item = c.at(0n);
  assert.equal(item.id, "v-1:original");
  assert.equal(item.color.id, "original");
  assert.equal(c.at(1n), null);
  for (const cat of ["mono", "multi", "gradient"])
    assert.equal(catalog(p, "v-1", cat).size, 0n);
  assert.equal(catalog(p, "missing", "original").size, 0n);
});

test("counts and selection resolve the single original", () => {
  const p = fixture();
  assert.equal(selectedCount(p, "v-1", "original"), 1n);
  assert.equal(selectedCount(p, "v-1", "mono"), 0n);
  const items = selectedItems(p);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "v-1:original");
  assert.deepEqual(
    deliveries(p, items).map((i) => i.id),
    ["v-1:original"],
  );
});

test("excluded originals disappear from the selection", () => {
  const p = fixture();
  p.excluded = ["v-1:original"];
  assert.equal(selectedCount(p, "v-1", "original"), 0n);
  assert.deepEqual(selectedItems(p), []);
});
