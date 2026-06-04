import test from "node:test";
import assert from "node:assert/strict";
import { isActionable, nextBaseline, scoreAnomaly, severityFromScore } from "./index.js";

test("anomaly scores rise for samples far from baseline", () => {
  const score = scoreAnomaly({ value: 240 }, { mean: 100, variance: 25, ewma: 110 });
  assert.equal(score, 100);
});

test("baseline tracks new values without jumping all the way", () => {
  const baseline = nextBaseline({ value: 130 }, { mean: 100, variance: 20, ewma: 100, alpha: 0.2 });
  assert.equal(Math.round(baseline.mean), 106);
  assert.equal(Math.round(baseline.ewma), 106);
});

test("severity maps high scores to critical", () => {
  assert.equal(severityFromScore(91), "critical");
  assert.equal(severityFromScore(70), "high");
  assert.equal(severityFromScore(45), "medium");
});

test("duplicate suppression prevents noisy repeats", () => {
  assert.equal(isActionable(50, 60_000, Date.now(), Date.now()), false);
  assert.equal(isActionable(50, 60_000, Date.now() - 90_000, Date.now()), true);
});

