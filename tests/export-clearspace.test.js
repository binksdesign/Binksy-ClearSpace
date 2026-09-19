import test from "node:test";
import assert from "node:assert/strict";
import { exportPlan, enabledVariants, safeFolder } from "../src/export-formats.js";
import { project, defaultComposition } from "../src/model.js";

const asset = (name) => ({
  svg: "<svg></svg>",
  name,
  box: { x: 0, y: 0, width: 200, height: 100 },
  roles: [],
});

const fixture = () => {
  const p = project();
  p.brand = "Atelier Nord";
  p.ready = [
    { id: "v-a", name: "Logo Horizontal", asset: asset("h.svg") },
    { id: "v-b", name: "Icone", asset: asset("i.svg") },
    { id: "v-c", name: "Off", asset: asset("o.svg") },
  ];
  p.active = "v-a";
  p.enabled = ["v-a", "v-b"];
  for (const v of p.ready) p.compositions[v.id] = defaultComposition();
  return p;
};

test("only enabled variants are exported", () => {
  const p = fixture();
  assert.deepEqual(
    enabledVariants(p).map((v) => v.id),
    ["v-a", "v-b"],
  );
});

test("every variant × format × tone is planned under one root", () => {
  const p = fixture();
  const jobs = exportPlan(p);
  // 2 variantes × 4 formats × 2 tons
  assert.equal(jobs.length, 16);
  assert.ok(jobs.every((j) => j.path.startsWith("ATELIER-NORD CLEARSPACE/")));
  assert.ok(jobs.some((j) => j.path === "ATELIER-NORD CLEARSPACE/Logo-Horizontal/SVG/Atelier-Nord-Logo-Horizontal-clearspace-clair.svg"));
  assert.ok(jobs.some((j) => j.path === "ATELIER-NORD CLEARSPACE/Icone/JPEG/Atelier-Nord-Icone-clearspace-fonce.jpeg"));
  assert.ok(jobs.some((j) => j.path.endsWith("/PDF/Atelier-Nord-Icone-clearspace-fonce.pdf")));
  const keys = jobs.map((j) => j.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(new Set(jobs.map((j) => j.path)).size, jobs.length);
});

test("selected formats drive the plan", () => {
  const p = fixture();
  p.exports.formats = ["svg"];
  const jobs = exportPlan(p);
  assert.equal(jobs.length, 4); // 2 variantes × 2 tons
  assert.ok(jobs.every((j) => j.format === "svg"));
});

test("a single variant still produces multiple jobs (always a ZIP)", () => {
  const p = fixture();
  p.enabled = ["v-a"];
  assert.ok(exportPlan(p).length > 1);
});

test("safeFolder strips path-breaking characters", () => {
  assert.equal(safeFolder("Logo / H:1"), "Logo-H-1");
  assert.equal(safeFolder("Logo Horizontal"), "Logo-Horizontal");
  assert.equal(safeFolder(""), "Logo");
});
