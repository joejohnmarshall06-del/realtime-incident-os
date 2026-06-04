# Realtime Incident OS

A high-complexity realtime incident command platform that demonstrates event sourcing, live collaboration, anomaly scoring, worker processes, SQLite projections, and a React operations console.

## Architecture

```text
client/      React command center with WebSocket updates
server/      Express API, WebSocket hub, SQLite event store, projections
worker/      Telemetry simulator and anomaly detector
shared/      Shared event contracts and scoring utilities
```

## Features

- Event-sourced incident lifecycle
- SQLite event log and read-model projections
- WebSocket broadcast for live incident updates
- Worker-driven telemetry simulation
- EWMA-based anomaly scoring
- Command-center dashboard with severity lanes
- Docker Compose local stack
- Testable shared domain utilities

## Run

```powershell
npm install
npm run dev
```

Frontend: `http://localhost:5174`

API: `http://localhost:4100`

## Docker

```powershell
docker compose up --build
```

## API

- `GET /api/health`
- `GET /api/incidents`
- `POST /api/incidents`
- `POST /api/incidents/:id/ack`
- `POST /api/incidents/:id/resolve`
- `GET /api/events`

## WebSocket

Connect to:

```text
ws://localhost:4100/realtime
```

Messages are shaped as:

```json
{
  "type": "incident.created",
  "payload": {}
}
```

