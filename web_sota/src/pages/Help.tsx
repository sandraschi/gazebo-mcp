import { useState } from "react";

const TABS = ["Overview", "Tools", "Setup", "Troubleshooting"];

const TOOLS = [
  { name: "sim_status", desc: "Health check — Gazebo CLI availability, version, depot stats", group: "Core Sim" },
  { name: "load_world", desc: "Load an SDF world file into the depot", group: "Core Sim" },
  { name: "spawn_model", desc: "Spawn a model into a running simulation via gz service", group: "Core Sim" },
  { name: "start_sim", desc: "Launch a Gazebo simulation as a background subprocess", group: "Core Sim" },
  { name: "stop_sim", desc: "Stop a running simulation", group: "Core Sim" },
  { name: "get_state", desc: "Query simulation process state and metadata", group: "Core Sim" },
  { name: "apply_control", desc: "Publish a command to a Gazebo topic via gz topic", group: "Core Sim" },
  { name: "list_worlds", desc: "List all worlds in the depot", group: "Core Sim" },
  { name: "list_jobs", desc: "List active and completed simulation jobs", group: "Core Sim" },
  { name: "agentic_sim_workflow", desc: "Multi-step simulation orchestration via host LLM", group: "AI Workflow" },
  { name: "natural_language_control", desc: "NL commands to topic payloads", group: "AI Workflow" },
  { name: "analyze_sim_state", desc: "NL analysis of sim state", group: "AI Workflow" },
  { name: "analyze_sim_logs", desc: "Root-cause analysis from sim stderr", group: "AI Workflow" },
  { name: "discover_model", desc: "Suggest SDF/URDF model URLs from description", group: "AI Workflow" },
];

const TROUBLES = [
  { symptom: "gz sim not found on PATH", cause: "Gazebo not installed or not on PATH", fix: "Install Gazebo from gazebosim.org. On Windows, add install bin dir to PATH." },
  { symptom: "World load fails: File not found", cause: "Missing or invalid SDF path", fix: "Use absolute path or valid URL. Supported formats: SDF (.sdf), URDF." },
  { symptom: "Simulation crashes on start", cause: "Invalid SDF/XML or GPU driver issue", fix: "Check stderr via get_state(). Use headless=true for headless mode." },
  { symptom: "WSL2 mode: gz not found inside WSL", cause: "Gazebo not installed in WSL2 distro", fix: "Install Gazebo in WSL2 Ubuntu: gazebosim.org/docs (verified against Gazebo 10.1.0)." },
  { symptom: "stop_sim leaves orphan gz process", cause: "WSL2 wrapper terminates but gz keeps running in WSL", fix: "Use wsl --terminate Ubuntu as big hammer to kill all WSL processes." },
  { symptom: "Web dashboard not loading", cause: "Backend or Vite not running", fix: "Ensure backend (10991) and Vite (10990) are both running. Check browser console." },
  { symptom: "Port already in use", cause: "Previous instance still listening", fix: "Get-NetTCPConnection -LocalPort 10990,10991 | Stop-Process -Id {OwningProcess} -Force" },
  { symptom: "apply_control publishes but no effect", cause: "Wrong topic name or message type", fix: "Use gz topic -l to list available topics, verify the topic name and message type." },
  { symptom: "list_worlds returns empty", cause: "No SDF files in depot", fix: "Use load_world(url=...) to add a world, or place .sdf files in worlds/." },
  { symptom: "Gazebo starts but no rendering", cause: "WSLg not running or headless mode", fix: "WSLg renders GUI on Windows 11. For headless-only environments, pass headless=true." },
];

export default function Help() {
  const [tab, setTab] = useState(0);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Help</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === i ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-100"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && <Overview />}
      {tab === 1 && <Tools />}
      {tab === 2 && <Setup />}
      {tab === 3 && <Troubleshooting />}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Overview() {
  return (
    <div className="space-y-4">
      <Card title="What It Is">
        <p className="text-sm text-slate-600 mb-2">
          <strong>gazebo-mcp</strong> wraps Gazebo (Ignition) simulator as MCP tools. Load worlds, control
          simulations, and monitor state from any MCP client.
        </p>
        <p className="text-sm text-slate-600">
          <strong>Gazebo must be installed separately.</strong> This MCP server connects to your existing
          Gazebo installation via the <code className="text-xs bg-slate-100 px-1 rounded">gz</code> CLI. On Windows, Gazebo is accessed through
          <strong> WSL2</strong> — the server auto-detects the <code className="text-xs bg-slate-100 px-1 rounded">wsl</code> command and translates paths to
          <code className="text-xs bg-slate-100 px-1 rounded"> /mnt/&lt;drive&gt;/...</code> automatically. GUI mode renders through WSLg.
        </p>
      </Card>

      <Card title="Architecture">
        <pre className="bg-slate-900 text-green-300 text-xs p-4 rounded font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto mb-3">
{`MCP Client (Claude Desktop, Cursor)
    │  stdio / HTTP
    ▼
FastMCP server (port 10991)
    │  subprocess (gz sim or wsl -e gz sim)
    ▼
Gazebo (Ignition) simulator
    │  SDF world loaded
    │  physics + sensor loop
    │  state via process info
    │  topic control via gz topic`}
        </pre>
        <p className="text-sm text-slate-600"><strong>Execution modes:</strong> <code className="text-xs bg-slate-100 px-1 rounded">sim_status</code> reports <code className="text-xs bg-slate-100 px-1 rounded">gz_mode</code> as <code className="text-xs bg-slate-100 px-1 rounded">native</code> (Linux native) or <code className="text-xs bg-slate-100 px-1 rounded">wsl</code> (Windows via WSL2).</p>
      </Card>

      <Card title="Ports">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-2 pr-4 font-medium">Port</th>
              <th className="pb-2 font-medium">Service</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 pr-4 text-xs font-mono">10991</td>
              <td className="py-2 text-xs text-slate-600">FastAPI backend + MCP HTTP</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-xs font-mono">10990</td>
              <td className="py-2 text-xs text-slate-600">Vite React frontend (dev)</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card title="Badges">
        <div className="flex gap-2 flex-wrap">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">Python 3.11+</span>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Gazebo (Ignition)</span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">14 tools</span>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">WSL2 compatible</span>
          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">Apache 2.0</span>
        </div>
      </Card>
    </div>
  );
}

function Tools() {
  const sim = TOOLS.filter((t) => t.group === "Core Sim");
  const ai = TOOLS.filter((t) => t.group === "AI Workflow");
  return (
    <div className="space-y-4">
      <Card title="Core Simulation Tools (9)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 pr-4 font-medium">Tool</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {sim.map((t) => (
                <tr key={t.name} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-xs font-mono text-blue-700 whitespace-nowrap">{t.name}</td>
                  <td className="py-2 text-xs text-slate-600">{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="AI Workflow Tools (5)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 pr-4 font-medium">Tool</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {ai.map((t) => (
                <tr key={t.name} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-xs font-mono text-blue-700 whitespace-nowrap">{t.name}</td>
                  <td className="py-2 text-xs text-slate-600">{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">Full reference: <code className="text-xs bg-slate-100 px-1 rounded">docs/TOOLS.md</code> in the repo.</p>
      </Card>
    </div>
  );
}

function Setup() {
  return (
    <div className="space-y-4">
      <Card title="Prerequisites">
        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
          <li><strong>Python 3.11+</strong> — tested with 3.12, 3.13</li>
          <li><strong>Gazebo (Ignition)</strong> — native (Linux) or in WSL2 (Windows)</li>
          <li><strong>Git</strong> — for cloning the repo</li>
          <li><strong>uv</strong> (recommended) — <code className="text-xs bg-slate-100 px-1 rounded">pip install uv</code></li>
          <li><strong>Node.js 20+</strong> — for the web dashboard</li>
        </ul>
      </Card>

      <Card title="Quick Install">
        <pre className="bg-slate-900 text-green-300 text-xs p-3 rounded font-mono whitespace-pre-wrap">
{`git clone https://github.com/sandraschi/gazebo-mcp
cd gazebo-mcp
uv sync
uv run python -m gazebo_mcp`}
        </pre>
        <p className="text-xs text-slate-500 mt-2">Or use <code className="text-xs bg-slate-100 px-1 rounded">.\start.bat</code> (backend + webapp) or <code className="text-xs bg-slate-100 px-1 rounded">.\start.ps1 -Headless</code> (backend only).</p>
      </Card>

      <Card title="WSL2 Setup (Windows)">
        <p className="text-sm text-slate-600 mb-2">
          Native Windows Gazebo support is effectively nonexistent. On Windows, install Gazebo
          inside your default WSL2 Ubuntu distro:
        </p>
        <pre className="bg-slate-900 text-green-300 text-xs p-3 rounded font-mono whitespace-pre-wrap">
{`# In WSL2 Ubuntu terminal:
sudo apt update
sudo apt install gazebo ignition-fortress
# Verify:
gz sim --version`}
        </pre>
        <p className="text-xs text-slate-500 mt-2">The server auto-detects WSL2 mode and translates paths to <code className="text-xs bg-slate-100 px-1 rounded">/mnt/&lt;drive&gt;/...</code>.</p>
      </Card>

      <Card title="Configuration">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 pr-4 font-medium">Variable</th>
                <th className="pb-2 pr-4 font-medium">Default</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4 text-xs font-mono">GAZEBO_MCP_PORT</td>
                <td className="py-2 pr-4 text-xs text-slate-500">10991</td>
                <td className="py-2 text-xs text-slate-600">MCP server HTTP port</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-xs font-mono">OLLAMA_URL</td>
                <td className="py-2 pr-4 text-xs text-slate-500">http://localhost:11434</td>
                <td className="py-2 text-xs text-slate-600">Ollama for AI tool fallback</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Development Commands">
        <pre className="bg-slate-900 text-green-300 text-xs p-3 rounded font-mono whitespace-pre-wrap">
{`just lint     # ruff check
just test     # pytest
just dev      # backend + frontend with hot reload
just e2e      # Playwright e2e tests`}
        </pre>
      </Card>
    </div>
  );
}

function Troubleshooting() {
  return (
    <Card title="Common Issues">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-2 pr-4 font-medium">Symptom</th>
              <th className="pb-2 pr-4 font-medium">Cause</th>
              <th className="pb-2 font-medium">Fix</th>
            </tr>
          </thead>
          <tbody>
            {TROUBLES.map((t, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 pr-4 text-xs text-red-700 font-medium align-top">{t.symptom}</td>
                <td className="py-2 pr-4 text-xs text-slate-600 align-top">{t.cause}</td>
                <td className="py-2 text-xs text-slate-800 font-mono align-top whitespace-pre-wrap">{t.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 p-3 bg-slate-50 rounded text-xs text-slate-600">
        <p className="mb-1"><strong>Log files:</strong> Per-job log in <code className="text-xs bg-slate-100 px-1 rounded">jobs/&lt;job_id&gt;/</code>, Gazebo server stderr captured by the subprocess wrapper</p>
        <p className="mb-1"><strong>Reset:</strong> Delete <code className="text-xs bg-slate-100 px-1 rounded">jobs/</code> and <code className="text-xs bg-slate-100 px-1 rounded">worlds/.depot/registry.json</code> to clear all state</p>
      </div>
    </Card>
  );
}
