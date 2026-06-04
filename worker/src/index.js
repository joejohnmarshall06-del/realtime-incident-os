import { isActionable, nextBaseline, scoreAnomaly, severityFromScore } from "@incident-os/shared";

const apiUrl = process.env.API_URL || "http://localhost:4100";
const duplicateWindowMs = 120_000;
const services = ["checkout", "identity", "search", "billing", "notifications"];
const baselines = new Map();
const lastIncidentByService = new Map();

function randomSample(service) {
  const base = service === "billing" ? 150 : 90;
  const jitter = Math.random() * 30;
  const spike = Math.random() > 0.88 ? Math.random() * 190 : 0;
  return {
    service,
    value: Math.round(base + jitter + spike),
    timestamp: Date.now()
  };
}

async function createIncident(sample, score) {
  const severity = severityFromScore(score);
  const body = {
    service: sample.service,
    title: `${sample.service} latency anomaly`,
    severity,
    score,
    owner: severity === "critical" ? "primary-on-call" : "triage"
  };

  const response = await fetch(`${apiUrl}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Incident create failed: ${response.status}`);
  }
}

async function tick() {
  for (const service of services) {
    const sample = randomSample(service);
    const previous = baselines.get(service) || { mean: 100, variance: 35, ewma: 100, alpha: 0.24 };
    const score = scoreAnomaly(sample, previous);
    const lastSeenAt = lastIncidentByService.get(service);

    baselines.set(service, nextBaseline(sample, previous));

    if (isActionable(score, duplicateWindowMs, lastSeenAt)) {
      await createIncident(sample, score);
      lastIncidentByService.set(service, Date.now());
      console.log(`Created incident for ${service} with score ${score}`);
    }
  }
}

setInterval(() => {
  tick().catch((error) => console.error(error.message));
}, 5_000);

tick().catch((error) => console.error(error.message));

