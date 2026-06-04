import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { nanoid } from "nanoid";
import { WebSocketServer } from "ws";
import { z } from "zod";
import { appendEvent, listEvents, listIncidents, migrate } from "./store.js";

const port = process.env.PORT || 4100;
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/realtime" });

migrate();

app.use(cors());
app.use(express.json());

function broadcast(message) {
  const encoded = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(encoded);
    }
  }
}

function record(type, aggregateId, payload) {
  const event = appendEvent(type, aggregateId, payload);
  broadcast({ type, payload: event });
  return event;
}

const createIncidentSchema = z.object({
  service: z.string().min(2),
  title: z.string().min(2),
  severity: z.enum(["low", "medium", "high", "critical"]),
  score: z.number().int().min(0).max(100),
  owner: z.string().optional()
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "realtime-incident-os" });
});

app.get("/api/incidents", (req, res) => {
  res.json(listIncidents());
});

app.post("/api/incidents", (req, res) => {
  const parsed = createIncidentSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const id = nanoid();
  const event = record("incident.created", id, parsed.data);
  return res.status(201).json(event);
});

app.post("/api/incidents/:id/ack", (req, res) => {
  const owner = String(req.body.owner || "on-call").trim();
  const event = record("incident.acknowledged", req.params.id, { owner });
  return res.json(event);
});

app.post("/api/incidents/:id/resolve", (req, res) => {
  const event = record("incident.resolved", req.params.id, { reason: req.body.reason || "mitigated" });
  return res.json(event);
});

app.get("/api/events", (req, res) => {
  res.json(listEvents(Number(req.query.limit || 100)));
});

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "snapshot", payload: { incidents: listIncidents() } }));
});

server.listen(port, () => {
  console.log(`Realtime Incident OS API running on http://localhost:${port}`);
});

