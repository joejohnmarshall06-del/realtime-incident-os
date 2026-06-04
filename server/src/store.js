import Database from "better-sqlite3";
import { nanoid } from "nanoid";

const databasePath = process.env.DATABASE_PATH || "incidents.db";
export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      service TEXT NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      score INTEGER NOT NULL,
      owner TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_events_aggregate ON events(aggregate_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
  `);
}

export function appendEvent(type, aggregateId, payload) {
  const event = {
    id: nanoid(),
    type,
    aggregateId,
    payload,
    createdAt: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO events (id, type, aggregate_id, payload, created_at)
    VALUES (@id, @type, @aggregateId, @payloadJson, @createdAt)
  `).run({ ...event, payloadJson: JSON.stringify(payload) });

  project(event);
  return event;
}

export function project(event) {
  if (event.type === "incident.created") {
    db.prepare(`
      INSERT INTO incidents (id, service, title, severity, status, score, owner, created_at, updated_at)
      VALUES (@id, @service, @title, @severity, 'open', @score, @owner, @createdAt, @createdAt)
    `).run({
      id: event.aggregateId,
      service: event.payload.service,
      title: event.payload.title,
      severity: event.payload.severity,
      score: event.payload.score,
      owner: event.payload.owner || null,
      createdAt: event.createdAt
    });
  }

  if (event.type === "incident.acknowledged") {
    db.prepare(`
      UPDATE incidents
      SET status = 'acknowledged', owner = @owner, updated_at = @updatedAt
      WHERE id = @id
    `).run({ id: event.aggregateId, owner: event.payload.owner, updatedAt: event.createdAt });
  }

  if (event.type === "incident.resolved") {
    db.prepare(`
      UPDATE incidents
      SET status = 'resolved', updated_at = @updatedAt, resolved_at = @updatedAt
      WHERE id = @id
    `).run({ id: event.aggregateId, updatedAt: event.createdAt });
  }
}

export function listIncidents() {
  return db.prepare(`
    SELECT * FROM incidents
    ORDER BY
      CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
      END,
      updated_at DESC
  `).all().map(mapIncident);
}

export function listEvents(limit = 100) {
  return db.prepare(`
    SELECT * FROM events
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit).map((row) => ({
    id: row.id,
    type: row.type,
    aggregateId: row.aggregate_id,
    payload: JSON.parse(row.payload),
    createdAt: row.created_at
  }));
}

export function mapIncident(row) {
  return {
    id: row.id,
    service: row.service,
    title: row.title,
    severity: row.severity,
    status: row.status,
    score: row.score,
    owner: row.owner,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at
  };
}

