import { useEffect, useMemo, useState } from "react";
import { Activity, Radio, ShieldCheck, Siren, Wifi } from "lucide-react";
import "./styles.css";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4100";
const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:4100/realtime";

type Incident = {
  id: string;
  service: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved";
  score: number;
  owner?: string;
  updatedAt: string;
};

type EventRecord = {
  id: string;
  type: string;
  aggregateId: string;
  createdAt: string;
};

export default function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [connected, setConnected] = useState(false);

  async function load() {
    const [incidentResponse, eventResponse] = await Promise.all([
      fetch(`${apiUrl}/api/incidents`),
      fetch(`${apiUrl}/api/events?limit=20`)
    ]);
    setIncidents(await incidentResponse.json());
    setEvents(await eventResponse.json());
  }

  useEffect(() => {
    load();
    const socket = new WebSocket(wsUrl);

    socket.addEventListener("open", () => setConnected(true));
    socket.addEventListener("close", () => setConnected(false));
    socket.addEventListener("message", (message) => {
      const decoded = JSON.parse(message.data);
      if (decoded.type === "snapshot") {
        setIncidents(decoded.payload.incidents);
      } else {
        load();
      }
    });

    return () => socket.close();
  }, []);

  const openCount = incidents.filter((incident) => incident.status !== "resolved").length;
  const criticalCount = incidents.filter((incident) => incident.severity === "critical" && incident.status !== "resolved").length;
  const avgScore = Math.round(incidents.reduce((sum, incident) => sum + incident.score, 0) / Math.max(incidents.length, 1));

  const lanes = useMemo(() => {
    return ["critical", "high", "medium", "low"].map((severity) => ({
      severity,
      incidents: incidents.filter((incident) => incident.severity === severity && incident.status !== "resolved")
    }));
  }, [incidents]);

  async function act(id: string, action: "ack" | "resolve") {
    await fetch(`${apiUrl}/api/incidents/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "ack" ? { owner: "on-call" } : { reason: "resolved from console" })
    });
    await load();
  }

  return (
    <main className="shell">
      <aside className="rail">
        <div className="logo"><Siren size={22} /></div>
        <button title="Command"><Activity size={19} /></button>
        <button title="Realtime"><Radio size={19} /></button>
        <button title="Assurance"><ShieldCheck size={19} /></button>
      </aside>

      <section className="workspace">
        <header className="header">
          <div>
            <p>Realtime Incident OS</p>
            <h1>Incident Command Surface</h1>
          </div>
          <span className={connected ? "connected" : "disconnected"}><Wifi size={16} /> {connected ? "Live" : "Offline"}</span>
        </header>

        <section className="stats">
          <Metric label="Open incidents" value={openCount} />
          <Metric label="Critical" value={criticalCount} tone="critical" />
          <Metric label="Average score" value={avgScore} />
        </section>

        <section className="lanes">
          {lanes.map((lane) => (
            <div className="lane" key={lane.severity}>
              <div className="lane-head">
                <h2>{lane.severity}</h2>
                <span>{lane.incidents.length}</span>
              </div>
              {lane.incidents.map((incident) => (
                <article className={`incident ${incident.severity}`} key={incident.id}>
                  <div className="incident-top">
                    <strong>{incident.service}</strong>
                    <span>{incident.score}</span>
                  </div>
                  <h3>{incident.title}</h3>
                  <p>{incident.owner || "unassigned"} · {incident.status}</p>
                  <div className="actions">
                    <button onClick={() => act(incident.id, "ack")}>Ack</button>
                    <button onClick={() => act(incident.id, "resolve")}>Resolve</button>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </section>

        <section className="timeline">
          <h2>Event Stream</h2>
          {events.map((event) => (
            <article key={event.id}>
              <span>{event.type}</span>
              <code>{event.aggregateId}</code>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <article className={`metric ${tone || ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

