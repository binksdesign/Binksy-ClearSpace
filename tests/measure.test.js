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

test("snap prefers a nearby logo edge within threshold", () => {
  const edges = [{ x: 100, y: 0 }];
  const q = measureSquare({ x: 0, y: 0 }, { x: 97, y: 40 }, edges, 5);
  assert.equal(q.size, 100);
});

test("edges outside the threshold are ignored", () => {
  const q = measureSquare({ x: 0, y: 0 }, { x: 60, y: 40 }, [{ x: 100, y: 0 }], 5);
  assert.equal(q.size, 60);
});
