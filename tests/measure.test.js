import test from "node:test";
import assert from "node:assert/strict";
import { measureSquare } from "../src/visual-measure.js";

test("square expands to the largest side", () => {
  const q = measureSquare({ x: 0, y: 0 }, { x: 30, y: 50 });
  assert.equal(q.size, 50);
  assert.deepEqual([q.x, q.y], [0, 0]);
});

test("square grows in negative directions", () => {
  const q = measureSquare({ x: 10, y: 10 }, { x: -20, y: 0 });
  assert.equal(q.size, 30);
  assert.deepEqual([q.x, q.y], [-20, -20]);
});

// Aucun magnétisme : la valeur suit exactement la position du pointeur.
test("value matches the pointer exactly, even close to a logo edge", () => {
  const start = { x: 0, y: 0 };
  assert.equal(measureSquare(start, { x: 97.3, y: 40 }).size, 97.3);
  assert.equal(measureSquare(start, { x: 99.9, y: 40 }).size, 99.9);
  assert.equal(measureSquare(start, { x: 100.1, y: 40 }).size, 100.1);
  assert.equal(measureSquare(start, { x: 102.7, y: 40 }).size, 102.7);
});

test("sub-unit precision is preserved", () => {
  assert.equal(measureSquare({ x: 5, y: 5 }, { x: 5.25, y: 5.75 }).size, 0.75);
});

test("size is clamped to a sane maximum", () => {
  assert.equal(measureSquare({ x: 0, y: 0 }, { x: 5e6, y: 0 }).size, 1e6);
});
