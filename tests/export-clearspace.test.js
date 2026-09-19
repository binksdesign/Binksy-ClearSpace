import test from "node:test";
import assert from "node:assert/strict";
import { exportPlan } from "../src/export-formats.js";
import { selectedItems, deliveries } from "../src/catalog.js";
import { project } from "../src/model.js";

const asset = () => ({
  svg: "<svg></svg>",
  name: "Logo",
  box: { x: 0, y: 0, width: 200, height: 100 },
  roles: [],
});
const fixture = () => {
  const p = project();
  p.brand = "Atelier";
  p.ready = [{ id: "v-1", name: "Logo", asset: asset() }];
  p.active = "v-1";
  p.enabled = ["v-1"];
  p.compositions["v-1"] = {
    ...project().compositions.horizontal,
    clearMethod: "auto",
    clearMultiplier: 1,
  };
  return p;
};

test("clearspace jobs cover tones and formats", () => {
  const p = fixture();
  const jobs = exportPlan(p, deliveries(p, selectedItems(p)));
  assert.equal(jobs.length, 6); // 1 variant × light/dark × svg/png/pdf
  const paths = jobs.map((j) => j.path);
  assert.ok(paths.every((x) => x.startsWith("ATELIER CLEARSPACE/CLEARSPACE/")));
  assert.ok(paths.some((x) => x.endsWith("-clair.svg")));
  assert.ok(paths.some((x) => x.endsWith("-fonce.pdf")));
  assert.ok(paths.some((x) => x.includes("/PNG/")));
  const keys = jobs.map((j) => j.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("visual without value falls back to the short side", () => {
  const p = fixture();
  p.compositions["v-1"].clearMethod = "visual";
  delete p.compositions["v-1"].visualMeasure;
  const jobs = exportPlan(p, deliveries(p, selectedItems(p)));
  assert.equal(jobs.length, 6);
});

test("formats selection drives the job count", () => {
  const p = fixture();
  p.exports.formats = ["svg"];
  const jobs = exportPlan(p, deliveries(p, selectedItems(p)));
  assert.equal(jobs.length, 2); // 1 variant × light/dark × svg
  assert.ok(jobs.every((j) => j.format === "svg"));
});

test("excluded files are filtered out", () => {
  const p = fixture();
  const all = exportPlan(p, deliveries(p, selectedItems(p)), true);
  p.excludedFiles = [all[0].key];
  const jobs = exportPlan(p, deliveries(p, selectedItems(p)));
  assert.equal(jobs.length, all.length - 1);
  assert.ok(!jobs.some((j) => j.key === all[0].key));
});
