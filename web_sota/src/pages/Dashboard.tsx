import { useEffect, useState } from "react";

interface FleetRepo {
  name: string;
  url: string;
  port: string;
  role: string;
}

const FLEET: FleetRepo[] = [
  { name: "gazebo-mcp", url: "—", port: "10990", role: "Simulation bridge" },
  { name: "robotics-mcp", url: "http://127.0.0.1:10706", port: "10706", role: "Fleet orchestration" },
  { name: "yahboom-mcp", url: "http://127.0.0.1:10893", port: "10893", role: "Physical robot control" },
  { name: "unity3d-mcp", url: "http://127.0.0.1:10831", port: "10831", role: "3D visualization" },
  { name: "resonite-mcp", url: "http://127.0.0.1:10979", port: "10979", role: "VR spatial sync" },
  { name: "freecad-mcp", url: "http://127.0.0.1:10945", port: "10945", role: "CAD model export" },
];

async function checkHealth(url: string): Promise<boolean> {
  if (!url.startsWith("http")) return false;
  try {
    const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

export default function Dashboard() {
  const [statuses, setStatuses] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    for (const repo of FLEET) {
      if (repo.url.startsWith("http")) {
        checkHealth(repo.url).then((up) =>
          setStatuses((s) => ({ ...s, [repo.name]: up }))
        );
      }
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Gazebo Fleet Mesh</h1>
      <p className="text-muted-foreground">
        Gazebo simulation bridge connected to the robotics fleet.
        Each repo below syncs with Gazebo simulation state.
      </p>

      <div className="grid gap-3">
        {FLEET.map((repo) => (
          <div
            key={repo.name}
            className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3"
          >
            <div>
              <div className="font-medium">{repo.name}</div>
              <div className="text-xs text-muted-foreground">
                :{repo.port} — {repo.role}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  statuses[repo.name] === true
                    ? "bg-green-500"
                    : statuses[repo.name] === false
                    ? "bg-red-500"
                    : "bg-gray-400"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {statuses[repo.name] === true ? "up" : statuses[repo.name] === false ? "down" : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
