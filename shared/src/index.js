export const severities = ["low", "medium", "high", "critical"];

export function scoreAnomaly(sample, baseline) {
  const variance = Math.max(baseline.variance, 1);
  const zScore = Math.abs(sample.value - baseline.mean) / Math.sqrt(variance);
  const trendPressure = Math.max(0, sample.value - baseline.ewma) / Math.max(baseline.ewma, 1);
  return Math.min(100, Math.round((zScore * 18) + (trendPressure * 45)));
}

export function nextBaseline(sample, previous) {
  const alpha = previous.alpha ?? 0.24;
  const delta = sample.value - previous.mean;
  const mean = previous.mean + alpha * delta;
  const variance = (1 - alpha) * (previous.variance + alpha * delta * delta);
  const ewma = alpha * sample.value + (1 - alpha) * previous.ewma;

  return { ...previous, mean, variance, ewma, alpha };
}

export function severityFromScore(score) {
  if (score >= 85) return "critical";
  if (score >= 68) return "high";
  if (score >= 42) return "medium";
  return "low";
}

export function isActionable(score, duplicateWindowMs, lastSeenAt, now = Date.now()) {
  return score >= 42 && (!lastSeenAt || now - lastSeenAt > duplicateWindowMs);
}

