import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../lib/api";

interface GazeboDemo {
  id: string;
  title: string;
  desc: string;
}

interface FleetModel {
  name: string;
  repo: string;
  format: string;
  size_kb: number;
  dashboard_url: string;
}

export default function Demos() {
  const [demos, setDemos] = useState<GazeboDemo[]>([]);
  const [fleet, setFleet] = useState<FleetModel[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState("");

  const [name, setName] = useState("fleet_rover");
  const [length, setLength] = useState("0.6");
  const [width, setWidth] = useState("0.4");
  const [height, setHeight] = useState("0.2");
  const [wheelR, setWheelR] = useState("0.09");
  const [color, setColor] = useState("0.1 0.6 0.9 1");
  const [spawnWorld, setSpawnWorld] = useState("");
  const [building, setBuilding] = useState(false);

  const fetchDemos = useCallback(async () => {
    try {
      const r = await fetch(API_BASE + "/api/demos");
      if (r.ok) {
        const data = await r.json();
        setDemos(data.data?.gazebo_demos || []);
        setFleet(data.data?.fleet_models || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchDemos();
  }, [fetchDemos]);

  const runDemo = async (demoId: string) => {
    setRunning(demoId);
    setResult("Running demo… (load world → start sim → spawn)");
    try {
      const r = await fetch(API_BASE + "/api/demos/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo_id: demoId, world_name: "empty_world" }),
      });
      const data = await r.json();
      setResult(
        (data.success ? "OK: " : "FAILED: ") +
          data.message +
          (data.steps ? "\n- " + data.steps.join("\n- ") : "") +
          (data.cmd_vel_topic ? `\nDrive it: apply_control topic ${data.cmd_vel_topic} "linear: {x: 0.5}" (job ${data.job_id})` : "")
      );
    } catch (e) {
      setResult("Error: " + String(e));
    } finally {
      setRunning(null);
    }
  };

  const buildRover = async () => {
    setBuilding(true);
    setResult("Building rover SDF…");
    try {
      const r = await fetch(API_BASE + "/api/demos/build-rover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          length: parseFloat(length) || 0.6,
          width: parseFloat(width) || 0.4,
          height: parseFloat(height) || 0.2,
          wheel_radius: parseFloat(wheelR) || 0.09,
          color,
          spawn_into_world: spawnWorld || null,
        }),
      });
      const data = await r.json();
      setResult(
        (data.success ? "OK: " : "FAILED: ") +
          data.message +
          (data.spawn ? "\nSpawn: " + JSON.stringify(data.spawn) : "") +
          (data.cmd_vel_topic ? `\nDrive it: ${data.cmd_vel_topic}` : "\nFind it on the Worlds page, then Start a sim and spawn it.")
      );
    } catch (e) {
      setResult("Error: " + String(e));
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="max-w-4xl" data-testid="demos">
      <h1 className="text-2xl font-bold mb-2">Demos</h1>
      <p className="text-sm text-slate-400 mb-6">
        One-click sims, a build-a-rover workshop, and the fleet's robot model library.
      </p>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-1">One-click Gazebo demos</h2>
        <p className="text-xs text-slate-500 mb-4">Loads the empty world, starts a headless sim, generates and spawns models.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {demos.map((d) => (
            <div key={d.id} className="bg-slate-900/60 rounded-xl p-4 border border-slate-700">
              <div className="text-sm font-semibold text-white">{d.title}</div>
              <div className="text-xs text-slate-400 mt-1 mb-3">{d.desc}</div>
              <button
                onClick={() => runDemo(d.id)}
                disabled={running !== null}
                data-testid={`demo-run-${d.id}`}
                className="bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
              >
                {running === d.id ? "Running…" : "Run demo"}
              </button>
            </div>
          ))}
          {demos.length === 0 && <div className="text-xs text-slate-500">Loading…</div>}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-1">Build a rover</h2>
        <p className="text-xs text-slate-500 mb-4">Generates a 4-wheel differential-drive SDF into your depot. Optionally spawns it into a running sim world.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <label className="block">Name
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500" />
          </label>
          <label className="block">Length (m)
            <input value={length} onChange={(e) => setLength(e.target.value)} className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500" />
          </label>
          <label className="block">Width (m)
            <input value={width} onChange={(e) => setWidth(e.target.value)} className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500" />
          </label>
          <label className="block">Height (m)
            <input value={height} onChange={(e) => setHeight(e.target.value)} className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500" />
          </label>
          <label className="block">Wheel radius (m)
            <input value={wheelR} onChange={(e) => setWheelR(e.target.value)} className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500" />
          </label>
          <label className="block">Color (RGBA)
            <select value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500">
              <option value="0.1 0.6 0.9 1">Fleet blue</option>
              <option value="0.9 0.1 0.1 1">Rescue red</option>
              <option value="0.95 0.7 0.1 1">Hazard yellow</option>
              <option value="0.2 0.8 0.2 1">Field green</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <label className="text-xs text-slate-400">Spawn into running world (optional):
            <input value={spawnWorld} onChange={(e) => setSpawnWorld(e.target.value)} placeholder="default" className="ml-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-cyan-500" />
          </label>
          <button
            onClick={buildRover}
            disabled={building}
            data-testid="demo-build-rover"
            className="bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            {building ? "Building…" : "Build rover"}
          </button>
        </div>
      </div>

      {result && (
        <pre className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs text-slate-300 max-h-60 overflow-auto whitespace-pre-wrap mb-6">{result}</pre>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <h2 className="text-lg font-semibold p-4 border-b border-slate-700">Fleet model library ({fleet.length})</h2>
        <p className="px-4 pt-3 text-xs text-slate-500">
          Robot models living in sibling repos. Gazebo reads SDF/URDF — the MJCF files below run in MuJoCo, linked for cross-sim work.
        </p>
        <div className="divide-y divide-slate-700">
          {fleet.length === 0 && <div className="p-4 text-sm text-slate-500">No models found — is mujoco-mcp checked out next to this repo?</div>}
          {fleet.map((m) => (
            <div key={m.repo + "/" + m.name} className="p-4 flex items-center justify-between gap-3 text-sm flex-wrap">
              <div>
                <span className="font-mono text-cyan-300 text-xs">{m.name}</span>
                <span className="text-slate-500 text-xs ml-2">{m.repo} · {m.format} · {m.size_kb} KB</span>
              </div>
              <a href={m.dashboard_url} target="_blank" rel="noreferrer" className="text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg px-3 py-1.5">
                Open dashboard →
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
