import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../lib/api";

interface Status {
  gz_available: boolean;
  gz_version: string | null;
  worlds_in_depot: number;
  active_jobs: number;
  tool_count?: number;
  uptime_seconds?: number;
  version?: string;
  status?: string;
}

interface Job {
  job_id: string;
  world_name: string;
  running?: boolean;
  completed?: boolean;
}

interface MeshPeer {
  id: string;
  label: string;
  role: string;
  backend_port: number;
  frontend_port: number;
  base_url: string;
  up: boolean;
  status_code: number | null;
  latency_ms: number | null;
  version?: string | null;
  start_command: string;
  detail?: string;
}

export default function Dashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState("");

  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [meshSummary, setMeshSummary] = useState("");
  const [startingPeer, setStartingPeer] = useState<string | null>(null);
  const [startingAll, setStartingAll] = useState(false);
  const [meshMsg, setMeshMsg] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/health");
      if (r.ok) setStatus(await r.json());
    } catch {}
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const r = await fetch(API_BASE + "/api/simulations");
      if (r.ok) {
        const data = await r.json();
        setJobs([...(data.active || []), ...(data.completed || [])]);
      }
    } catch {}
  }, []);

  const fetchMesh = useCallback(async () => {
    try {
      const r = await fetch(API_BASE + "/api/mesh/status");
      if (r.ok) {
        const data = await r.json();
        setPeers(data.data?.peers || []);
        setMeshSummary(data.message || "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchJobs();
    fetchMesh();
    const iv = setInterval(() => {
      fetchJobs();
      fetchMesh();
    }, 5000);
    return () => clearInterval(iv);
  }, [fetchStatus, fetchJobs, fetchMesh]);

  const handleStartPeer = async (peerId: string) => {
    setStartingPeer(peerId);
    setMeshMsg("");
    try {
      const r = await fetch(API_BASE + "/api/mesh/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peer: peerId }),
      });
      const data = await r.json();
      setMeshMsg(data.message || (data.success ? "Started" : "Failed"));
    } catch (e) {
      setMeshMsg(String(e));
    } finally {
      setStartingPeer(null);
      setTimeout(fetchMesh, 3000);
    }
  };

  const handleStartAll = async () => {
    setStartingAll(true);
    setMeshMsg("");
    try {
      const r = await fetch(API_BASE + "/api/mesh/start-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await r.json();
      setMeshMsg(data.message || "Start-all requested");
    } catch (e) {
      setMeshMsg(String(e));
    } finally {
      setStartingAll(false);
      setTimeout(fetchMesh, 4000);
    }
  };

  const handleAiExecute = async () => {
    setAiResult("Thinking...");
    try {
      const r = await fetch(API_BASE + "/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2:3b",
          prompt: `You are a Gazebo simulation assistant. ${aiPrompt}`,
        }),
      });
      const data = await r.json();
      setAiResult(data.response || data.error || "No response");
    } catch (e) {
      setAiResult(String(e));
    }
  };

  const downCount = peers.filter((p) => !p.up).length;

  return (
    <div className="max-w-5xl" data-testid="dashboard">
      {/* Hero — what is this actually good for */}
      <div
        className="rounded-2xl p-6 mb-6 border border-cyan-900 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950"
        data-testid="hero"
      >
        <div className="text-xs uppercase tracking-widest text-cyan-400 mb-1">
          Gazebo Simulation Hub
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          High-fidelity physics for fleet robots — without leaving Windows
        </h1>
        <p className="text-sm text-slate-300 max-w-3xl mb-4">
          gazebo-mcp runs Gazebo Garden / Harmonic (via WSL2) as isolated sim jobs:
          load an SDF world into the depot, start headless physics, spawn models,
          and publish velocity / torque commands over ROS 2 topics. Unitree, LimX
          and the rest of the fleet dock here for sensor-rich testing before touching
          real hardware.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700">
            <div className="text-sm font-semibold text-cyan-300">1. Depot + Jobs</div>
            <div className="text-xs text-slate-400 mt-1">
              Worlds in <code>worlds/</code>, each <code>gz sim</code> run isolated in{" "}
              <code>jobs/&lt;id&gt;/</code> with its own log + metadata.
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700">
            <div className="text-sm font-semibold text-cyan-300">2. ROS 2 control</div>
            <div className="text-xs text-slate-400 mt-1">
              <code>apply_control</code> publishes Twist payloads to{" "}
              <code>/model/…/cmd_vel</code> — same topics the physical robots use.
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700">
            <div className="text-sm font-semibold text-cyan-300">3. Mesh, not monolith</div>
            <div className="text-xs text-slate-400 mt-1">
              MuJoCo for speed, Isaac for GPU sensors, Gazebo for full-stack ROS 2.
              Start the ring below, compare, pick the right physics.
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-400">
          Quickstart: <span className="text-slate-200">Worlds page → Load empty world</span>
          {" → "}
          <span className="text-slate-200">Simulations page → Start (headless)</span>
          {" → "}
          <span className="text-slate-200">publish cmd_vel → AI Analyze</span>
          {" · "}
          WSL2 + Gazebo required for real runs; without it the dashboard still manages the depot and mesh.
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8" data-testid="kpi-grid">
        {[
          { label: "Gazebo", value: status?.gz_version ?? (status?.gz_available ? "Available" : "N/A"), testid: "kpi-gazebo" },
          { label: "Worlds in Depot", value: status?.worlds_in_depot ?? "...", testid: "kpi-worlds" },
          { label: "Active Jobs", value: status?.active_jobs ?? "...", testid: "kpi-jobs" },
          { label: "Server Status", value: status ? "Online" : "Loading...", testid: "kpi-server" },
          { label: "Tools", value: status?.tool_count ?? "...", testid: "kpi-tools" },
        ].map((c) => (
          <div key={c.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700" data-testid={c.testid}>
            <div className="text-xs text-slate-400 uppercase tracking-wider">{c.label}</div>
            <div className="text-2xl font-bold mt-1 text-cyan-300">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Meshed backends — up/down is not enough, start them here */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 mb-8" data-testid="mesh-panel">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold">Meshed Backends</h2>
            <div className="text-xs text-slate-400 mt-0.5">
              {meshSummary || "Probing fleet sim ring…"} · starts the peer&apos;s{" "}
              <code>start.ps1 -BackendOnly</code> detached — re-probes automatically.
            </div>
          </div>
          <button
            onClick={handleStartAll}
            disabled={startingAll || peers.length === 0 || downCount === 0}
            data-testid="mesh-start-all"
            className="bg-green-700 hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {startingAll ? "Starting…" : downCount === 0 ? "All up" : `Start all (${downCount} down)`}
          </button>
        </div>
        <div className="divide-y divide-slate-700">
          {peers.length === 0 && (
            <div className="p-4 text-sm text-slate-500">Probing peers…</div>
          )}
          {peers.map((p) => (
            <div key={p.id} className="p-4 flex items-center justify-between gap-4 text-sm flex-wrap">
              <div className="min-w-52 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${p.up ? "bg-green-500" : "bg-red-500"}`}
                    title={p.up ? "up" : p.detail || "down"}
                  />
                  <span className="font-medium">{p.label}</span>
                  <span className="text-slate-500 text-xs font-mono">{p.id}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 ml-4">{p.role}</div>
                <div className="text-xs text-slate-500 mt-0.5 ml-4 font-mono">
                  :{p.backend_port} → {p.up ? `${p.status_code} · ${p.latency_ms}ms` : "down"}
                  {p.version ? ` · ${p.version}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    p.up ? "bg-green-900 text-green-300" : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {p.up ? "Up" : "Down"}
                </span>
                {!p.up && (
                  <button
                    onClick={() => handleStartPeer(p.id)}
                    disabled={startingPeer === p.id}
                    data-testid={`mesh-start-${p.id}`}
                    title={p.start_command}
                    className="bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-400 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    {startingPeer === p.id ? "Starting…" : "Start"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {meshMsg && (
          <div className="px-4 py-3 border-t border-slate-700 text-xs text-slate-300 font-mono whitespace-pre-wrap">
            {meshMsg}
          </div>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-8">
        <h2 className="text-lg font-semibold mb-3">Quick AI Workflow</h2>
        <div className="flex gap-3">
          <input
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="e.g. load the empty world and start a simulation"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAiExecute()}
          />
          <button
            onClick={handleAiExecute}
            className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Execute
          </button>
        </div>
        {aiResult && (
          <pre className="mt-3 bg-slate-900 rounded-lg p-3 text-xs text-slate-300 max-h-40 overflow-auto whitespace-pre-wrap">
            {aiResult}
          </pre>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <h2 className="text-lg font-semibold p-4 border-b border-slate-700">Active Jobs</h2>
        <div className="divide-y divide-slate-700">
          {jobs.length === 0 && (
            <div className="p-4 text-sm text-slate-500">No jobs yet. Start a simulation from the Simulations page.</div>
          )}
          {jobs.map((job) => (
            <div key={job.job_id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{job.world_name}</span>
                <span className="text-slate-500 ml-2">#{job.job_id}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  job.running
                    ? "bg-green-900 text-green-300"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {job.running ? "Running" : job.completed ? "Completed" : "Stopped"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
