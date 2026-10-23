import { useState } from "react";

const TABS = ["Newbie start here", "Gazebo online", "Fleet worlds", "Tools", "Setup", "Troubleshooting"];

const TOOLS = [
  { name: "sim_status", desc: "Health check — Gazebo CLI availability, version, depot stats", group: "Core Sim" },
  { name: "load_world", desc: "Load an SDF world file into the depot", group: "Core Sim" },
  { name: "spawn_model", desc: "Spawn a model into a running simulation via gz service", group: "Core Sim" },
  { name: "start_sim", desc: "Launch a Gazebo simulation as a background subprocess", group: "Core Sim" },
  { name: "stop_sim", desc: "Stop a running simulation", group: "Core Sim" },
  { name: "get_state", desc: "Query simulation process state and metadata", group: "Core Sim" },
  { name: "apply_control", desc: "Publish a command to a Gazebo topic via gz topic", group: "Core Sim" },
  { name: "topic_list", desc: "List all active Gazebo topics via gz topic -l", group: "Core Sim" },
  { name: "service_call", desc: "Call an arbitrary Gazebo service (spawn, delete, pause)", group: "Core Sim" },
  { name: "delete_world", desc: "Delete a world from the depot (refuses if a live job uses it)", group: "Core Sim" },
  { name: "rename_world", desc: "Rename a depot world (registry + file)", group: "Core Sim" },
  { name: "list_worlds", desc: "List all worlds in the depot", group: "Core Sim" },
  { name: "list_jobs", desc: "List active and completed simulation jobs", group: "Core Sim" },
  { name: "agentic_sim_workflow", desc: "Multi-step simulation orchestration via host LLM", group: "AI Workflow" },
  { name: "natural_language_control", desc: "NL commands to topic payloads", group: "AI Workflow" },
  { name: "analyze_sim_state", desc: "NL analysis of sim state", group: "AI Workflow" },
  { name: "analyze_sim_logs", desc: "Root-cause analysis from sim stderr", group: "AI Workflow" },
  { name: "discover_model", desc: "Suggest SDF/URDF model URLs from description", group: "AI Workflow" },
];

const TROUBLES = [
  { symptom: "gz sim not found on PATH", cause: "Gazebo not installed or not on PATH", fix: "Install Gazebo from gazebosim.org. On Windows, install inside WSL2 Ubuntu — native Windows Gazebo is effectively nonexistent." },
  { symptom: "World load fails: File not found", cause: "Missing or invalid SDF path", fix: "Use absolute path or valid URL. Supported formats: SDF (.sdf), URDF." },
  { symptom: "Simulation crashes on start", cause: "Invalid SDF/XML or GPU driver issue", fix: "Check stderr via get_state(). Use headless=true for headless mode." },
  { symptom: "WSL2 mode: gz not found inside WSL", cause: "Gazebo not installed in WSL2 distro", fix: "In WSL2 Ubuntu: sudo apt install gazebo ignition-fortress, then gz sim --version." },
  { symptom: "stop_sim leaves orphan gz process", cause: "WSL2 wrapper terminates but gz keeps running in WSL", fix: "Use wsl --terminate Ubuntu as big hammer to kill all WSL processes." },
  { symptom: "Web dashboard not loading", cause: "Backend or Vite not running", fix: "Ensure backend (10991) and Vite (10990) are both running. Check browser console." },
  { symptom: "Port already in use", cause: "Previous instance still listening", fix: "Get-NetTCPConnection -LocalPort 10990,10991 | Stop-Process -Id {OwningProcess} -Force" },
  { symptom: "apply_control publishes but no effect", cause: "Wrong topic name or message type", fix: "Use gz topic -l to list available topics, verify the topic name and message type." },
  { symptom: "list_worlds returns empty", cause: "No SDF files in depot", fix: "Use load_world(url=...) to add a world, or place .sdf files in worlds/." },
  { symptom: "Gazebo starts but no rendering", cause: "WSLg not running or headless mode", fix: "WSLg renders GUI on Windows 11. For headless-only environments, pass headless=true." },
  { symptom: "Meshed backend shows Down", cause: "Peer MCP server not started (expected — they are separate repos)", fix: "Dashboard → Meshed Backends → Start (or Start all). Re-probes automatically in ~5s." },
];

export default function Help() {
  const [tab, setTab] = useState(0);
  return (
    <div className="max-w-4xl" data-testid="help">
      <h1 className="text-2xl font-bold mb-6">Help</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === i ? "bg-cyan-700 text-white" : "border border-slate-600 text-slate-300 hover:bg-slate-800"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && <Newbie />}
      {tab === 1 && <GazeboOnline />}
      {tab === 2 && <FleetWorlds />}
      {tab === 3 && <Tools />}
      {tab === 4 && <Setup />}
      {tab === 5 && <Troubleshooting />}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-4">
      <h2 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Newbie() {
  return (
    <div className="space-y-4">
      <Card title="What is Gazebo? (60 seconds)">
        <p className="text-sm text-slate-300 mb-2">
          <strong className="text-white">Gazebo</strong> is an open-source 3D robot
          simulator — think flight simulator, but for robots. It steps rigid-body physics,
          simulates sensors (lidar, cameras, IMU, contact forces), and renders the scene,
          all driven by a <strong className="text-white">world file</strong> you load and{" "}
          <strong className="text-white">topics</strong> you publish to. This repo targets{" "}
          <strong className="text-white">Gazebo Garden / Harmonic</strong>, controlled through
          the <code className="text-xs bg-slate-700 px-1 rounded">gz</code> CLI.
        </p>
        <p className="text-sm text-slate-300">
          <strong className="text-white">gazebo-mcp</strong> is the fleet wrapper around it:
          it manages a <em>world depot</em>, runs each simulation as an isolated{" "}
          <em>job</em> subprocess, and exposes everything as MCP tools + this dashboard.
          On Windows Gazebo runs inside <strong className="text-white">WSL2</strong> — the
          server auto-detects <code className="text-xs bg-slate-700 px-1 rounded">wsl</code> and
          translates <code className="text-xs bg-slate-700 px-1 rounded">D:\…</code> paths to{" "}
          <code className="text-xs bg-slate-700 px-1 rounded">/mnt/d/…</code> for you. GUI mode
          renders through WSLg.
        </p>
      </Card>

      <Card title="Words you will see everywhere">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            ["World (.sdf)", "The stage: an XML file describing ground, lights, physics, and which models start where. Stored in worlds/."],
            ["Model (.sdf / .urdf)", "An actor: a robot, car, cone, table. Spawned into a running world with spawn_model."],
            ["Topic (/model/car/cmd_vel)", "A named channel you publish velocity / torque / position commands to. Same idea as ROS 2 topics."],
            ["Job (<8-hex id>)", "One gz sim run. Isolated dir jobs/<id>/ with metadata.json + runner.log. Start it, poll it, stop it."],
            ["Depot", "Your library of world files. load_world downloads/copies an SDF into worlds/ + registry."],
            ["Headless (-s)", "Run physics with no window. Use it on servers and when WSLg rendering is flaky."],
          ].map(([term, def]) => (
            <div key={term} className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
              <div className="font-mono text-xs text-cyan-300 mb-1">{term}</div>
              <div className="text-xs text-slate-400">{def}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="What is this actually good for?">
        <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5">
          <li><strong className="text-white">Crash safely first:</strong> test navigation, cmd_vel control, and spawn logic in physics before touching a real Unitree / LimX / Yahboom robot.</li>
          <li><strong className="text-white">Same topics as hardware:</strong> <code className="text-xs bg-slate-700 px-1 rounded">apply_control</code> publishes Twist payloads to <code className="text-xs bg-slate-700 px-1 rounded">/model/…/cmd_vel</code> — the workflow transfers to ROS 2 robots.</li>
          <li><strong className="text-white">Sensor-rich fleet testing:</strong> Gazebo is the full-stack choice (physics + sensors + rendering); MuJoCo is faster/lighter, Isaac adds GPU sensors. Compare them from the Dashboard mesh panel.</li>
          <li><strong className="text-white">AI-assisted debugging:</strong> natural-language control plus LLM state/log analysis when a sim misbehaves.</li>
        </ul>
        <p className="text-xs text-slate-500 mt-3">
          Not good for: real-time guarantees on Windows (WSL2 adds jitter), photoreal rendering
          (use Isaac/Unity for that), or tuning hardware PID gains 1:1.
        </p>
      </Card>

      <Card title="Your first sim in 5 minutes">
        <ol className="list-decimal list-inside text-sm text-slate-300 space-y-1.5">
          <li><strong className="text-white">Dashboard → Meshed Backends:</strong> confirm this backend is up. Start ROS 2 bridge (ros-mcp) if you plan topic control.</li>
          <li><strong className="text-white">Worlds page → load a world:</strong> paste an SDF URL (or pick the empty world) and load it into the depot.</li>
          <li><strong className="text-white">Simulations page → Start:</strong> select the world, keep Headless on, Start. You get a job id like <code className="text-xs bg-slate-700 px-1 rounded">a1b2c3d4</code>.</li>
          <li><strong className="text-white">Publish a command:</strong> job → apply_control, topic <code className="text-xs bg-slate-700 px-1 rounded">/model/vehicle/cmd_vel</code>, linear x 0.5. Or type “move the robot forward” in Quick AI Workflow.</li>
          <li><strong className="text-white">Inspect:</strong> expand the job → state, runner.log on crash, AI Analyze for a plain-English summary. Stop the job when done.</li>
        </ol>
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
        <p className="text-sm text-slate-400"><strong className="text-slate-200">Execution modes:</strong> <code className="text-xs bg-slate-700 px-1 rounded">sim_status</code> reports <code className="text-xs bg-slate-700 px-1 rounded">gz_mode</code> as <code className="text-xs bg-slate-700 px-1 rounded">native</code> (Linux native) or <code className="text-xs bg-slate-700 px-1 rounded">wsl</code> (Windows via WSL2).</p>
      </Card>

      <Card title="Ports">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="pb-2 pr-4 font-medium">Port</th>
              <th className="pb-2 font-medium">Service</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-700">
              <td className="py-2 pr-4 text-xs font-mono text-cyan-300">10991</td>
              <td className="py-2 text-xs text-slate-300">FastAPI backend + MCP HTTP</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 pr-4 text-xs font-mono text-cyan-300">10990</td>
              <td className="py-2 text-xs text-slate-300">Vite React frontend (dev)</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-xs font-mono text-cyan-300">11044–11053</td>
              <td className="py-2 text-xs text-slate-300">Meshed sim ring (LimX / MuJoCo / Isaac / ROS / Unitree) — see Dashboard</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const GAZEBO_LINKS: { group: string; links: { label: string; url: string; note: string }[] }[] = [
  {
    group: "Official",
    links: [
      { label: "gazebosim.org", url: "https://gazebosim.org", note: "Home — releases Garden / Harmonic, install guides." },
      { label: "Documentation", url: "https://gazebosim.org/docs", note: "Versioned tutorials, pick Garden or Harmonic." },
      { label: "Fuel — free models & worlds", url: "https://app.gazebosim.org/fuel", note: "Apache/CC assets. Search here, paste URLs on the Downloads page." },
      { label: "SDFormat spec", url: "http://sdformat.org", note: "The .sdf file format reference (links, joints, plugins)." },
    ],
  },
  {
    group: "GitHub",
    links: [
      { label: "gazebosim (org)", url: "https://github.com/gazebosim", note: "Every gz-* library lives here." },
      { label: "gz-sim", url: "https://github.com/gazebosim/gz-sim", note: "The simulator. Examples folder has free .sdf worlds." },
      { label: "sdformat", url: "https://github.com/gazebosim/sdformat", note: "Parser + spec tooling." },
      { label: "ros_gz bridge", url: "https://github.com/gazebosim/ros_gz", note: "Gazebo ↔ ROS 2 topic/service bridge." },
      { label: "Classic gazebo_models", url: "https://github.com/osrf/gazebo_models", note: "Hundreds of free SDF models (Gazebo Classic era, mostly loadable)." },
    ],
  },
  {
    group: "Community",
    links: [
      { label: "Gazebo Answers", url: "https://answers.gazebosim.org", note: "Q&A archive — search before asking, most errors are answered." },
      { label: "Robotics Stack Exchange (gazebo tag)", url: "https://robotics.stackexchange.com/questions/tagged/gazebo", note: "Active successor venue for how-to questions." },
      { label: "gz-sim Discussions", url: "https://github.com/gazebosim/gz-sim/discussions", note: "Ask the maintainers directly." },
    ],
  },
];

function GazeboOnline() {
  return (
    <div className="space-y-4">
      <Card title="Gazebo on the web">
        <p className="text-sm text-slate-300 mb-4">
          The simulator is a big open-source project (Open Robotics). Everything below is free —
          bookmark Fuel and the docs, they are the two you will actually use weekly.
        </p>
        {GAZEBO_LINKS.map((g) => (
          <div key={g.group} className="mb-4">
            <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2">{g.group}</div>
            <div className="space-y-2">
              {g.links.map((l) => (
                <div key={l.url} className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                  <a href={l.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-cyan-300 hover:underline">
                    {l.label} →
                  </a>
                  <div className="text-xs text-slate-500 font-mono break-all">{l.url}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{l.note}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

const FLEET_ENVS: { repo: string; kind: string; fe: number | null; be: number | null; blurb: string }[] = [
  { repo: "gazebo-mcp", kind: "Physics sim", fe: 10990, be: 10991, blurb: "This repo — Gazebo Garden/Harmonic, SDF depot, isolated jobs." },
  { repo: "mujoco-mcp", kind: "Physics sim", fe: 11047, be: 11046, blurb: "Lightweight MuJoCo, Menagerie incl. Unitree Go2/H1." },
  { repo: "isaac-mcp", kind: "GPU sim", fe: 11048, be: 11049, blurb: "NVIDIA Isaac Sim/Lab, GPU sensors." },
  { repo: "ros-mcp", kind: "Bridge", fe: 11051, be: 11050, blurb: "ROS 2 topics/services/params/bags bridge." },
  { repo: "simbench-mcp", kind: "Benchmark", fe: 11085, be: 11084, blurb: "Cross-simulator benchmark layer." },
  { repo: "vla-mcp", kind: "VLA", fe: 11025, be: 11024, blurb: "Vision-language-action bridge (WALL-X)." },
  { repo: "robotics-mcp", kind: "Orchestration", fe: 10706, be: 11199, blurb: "Generic fleet robotics orchestration." },
  { repo: "unitree-mcp", kind: "Robot", fe: 11053, be: 11052, blurb: "Unitree Go2 / H1 quadruped + humanoid." },
  { repo: "limx-robotics-mcp", kind: "Robot", fe: 11045, be: 11044, blurb: "LimX biped/humanoid + VLA bridge." },
  { repo: "yahboom-mcp", kind: "Robot", fe: 10893, be: 10892, blurb: "Yahboom ROSMASTER physical rover." },
  { repo: "norirobotics-mcp", kind: "Robot", fe: 11971, be: 11970, blurb: "Nori SDK / WebRTC bridge." },
  { repo: "unity3d-mcp", kind: "Render", fe: 10830, be: 10831, blurb: "Unity 3D visualization / rendering." },
  { repo: "godot-mcp", kind: "Game engine", fe: 10992, be: 10993, blurb: "Godot engine bridge." },
  { repo: "blender-mcp", kind: "3D content", fe: 10848, be: 10849, blurb: "Blender modeling/render bridge." },
  { repo: "overte-mcp", kind: "VR", fe: 11110, be: 11111, blurb: "Overte open virtual worlds." },
  { repo: "resonite-mcp", kind: "VR", fe: 10978, be: 10979, blurb: "Resonite VR spatial sync." },
  { repo: "vrchat-mcp", kind: "Social VR", fe: 10712, be: null, blurb: "VRChat dashboard." },
  { repo: "worldlabs-mcp", kind: "World gen", fe: 10864, be: 10865, blurb: "Marble world generation." },
  { repo: "ai-games-collection", kind: "Games", fe: 10986, be: 10987, blurb: "Chess/shogi/go/othello engines + dashboard." },
];

function FleetWorlds() {
  return (
    <Card title="Fleet virtual / sim / game environments">
      <p className="text-sm text-slate-300 mb-4">
        Every world you can send a robot (or yourself) into, and where its dashboard lives when it is running.
        GitHub: <code className="text-xs bg-slate-700 px-1 rounded font-mono">github.com/sandraschi/&lt;repo&gt;</code>.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="pb-2 pr-3 font-medium">Repo</th>
              <th className="pb-2 pr-3 font-medium">Kind</th>
              <th className="pb-2 pr-3 font-medium">Dashboard</th>
              <th className="pb-2 font-medium">What it is</th>
            </tr>
          </thead>
          <tbody>
            {FLEET_ENVS.map((e) => (
              <tr key={e.repo} className="border-b border-slate-700 align-top">
                <td className="py-2 pr-3">
                  <a
                    href={`https://github.com/sandraschi/${e.repo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-cyan-300 hover:underline whitespace-nowrap"
                  >
                    {e.repo} →
                  </a>
                </td>
                <td className="py-2 pr-3 text-xs text-slate-400 whitespace-nowrap">{e.kind}</td>
                <td className="py-2 pr-3 text-xs font-mono text-slate-400 whitespace-nowrap">
                  {e.fe ? <a href={`http://127.0.0.1:${e.fe}`} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">:{e.fe}</a> : "—"}
                </td>
                <td className="py-2 text-xs text-slate-300">{e.blurb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-3">Dashboards answer only while that repo's backend is running — start peers from the Dashboard mesh panel.</p>
    </Card>
  );
}

function Tools() {
  const sim = TOOLS.filter((t) => t.group === "Core Sim");
  const ai = TOOLS.filter((t) => t.group === "AI Workflow");
  return (
    <div className="space-y-4">
      <Card title="Core Simulation Tools (13)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="pb-2 pr-4 font-medium">Tool</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {sim.map((t) => (
                <tr key={t.name} className="border-b border-slate-700">
                  <td className="py-2 pr-4 text-xs font-mono text-cyan-300 whitespace-nowrap">{t.name}</td>
                  <td className="py-2 text-xs text-slate-300">{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <pre className="bg-slate-900 text-green-300 text-xs p-3 rounded font-mono whitespace-pre-wrap mt-3">
{`apply_control(job_id="a1b2c3d4",
  topic="/model/vehicle/cmd_vel",
  command="linear: {x: 0.5}")`}
        </pre>
      </Card>

      <Card title="AI Workflow Tools (5)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="pb-2 pr-4 font-medium">Tool</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {ai.map((t) => (
                <tr key={t.name} className="border-b border-slate-700">
                  <td className="py-2 pr-4 text-xs font-mono text-cyan-300 whitespace-nowrap">{t.name}</td>
                  <td className="py-2 text-xs text-slate-300">{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">Full reference: <code className="text-xs bg-slate-700 px-1 rounded text-slate-300">docs/TOOLS.md</code> in the repo. Tools are discovered dynamically from the server at runtime.</p>
      </Card>
    </div>
  );
}

function Setup() {
  return (
    <div className="space-y-4">
      <Card title="Prerequisites">
        <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
          <li><strong>Python 3.11+</strong> — tested with 3.12, 3.13</li>
          <li><strong>Gazebo (Ignition)</strong> — native (Linux) or in WSL2 (Windows)</li>
          <li><strong>Git</strong> — for cloning the repo</li>
          <li><strong>uv</strong> (recommended) — <code className="text-xs bg-slate-700 px-1 rounded">pip install uv</code></li>
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
        <p className="text-xs text-slate-500 mt-2">Or use <code className="text-xs bg-slate-700 px-1 rounded">.\start.bat</code> (backend + webapp) or <code className="text-xs bg-slate-700 px-1 rounded">.\start.ps1 -Headless</code> (backend only).</p>
      </Card>

      <Card title="WSL2 Setup (Windows)">
        <p className="text-sm text-slate-300 mb-2">
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
        <p className="text-xs text-slate-500 mt-2">The server auto-detects WSL2 mode and translates paths to <code className="text-xs bg-slate-700 px-1 rounded">/mnt/&lt;drive&gt;/...</code>. Check Dashboard KPI or <code className="text-xs bg-slate-700 px-1 rounded">sim_status</code> for gz_mode.</p>
      </Card>

      <Card title="Configuration">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="pb-2 pr-4 font-medium">Variable</th>
                <th className="pb-2 pr-4 font-medium">Default</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700">
                <td className="py-2 pr-4 text-xs font-mono text-cyan-300">GAZEBO_MCP_PORT</td>
                <td className="py-2 pr-4 text-xs text-slate-500">10991</td>
                <td className="py-2 text-xs text-slate-300">MCP server HTTP port</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-xs font-mono text-cyan-300">OLLAMA_URL</td>
                <td className="py-2 pr-4 text-xs text-slate-500">http://localhost:11434</td>
                <td className="py-2 text-xs text-slate-300">Ollama for AI tool fallback</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-2">World / jobs directories are editable live on the Settings page (session-only).</p>
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
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="pb-2 pr-4 font-medium">Symptom</th>
              <th className="pb-2 pr-4 font-medium">Cause</th>
              <th className="pb-2 font-medium">Fix</th>
            </tr>
          </thead>
          <tbody>
            {TROUBLES.map((t, i) => (
              <tr key={i} className="border-b border-slate-700">
                <td className="py-2 pr-4 text-xs text-red-400 font-medium align-top">{t.symptom}</td>
                <td className="py-2 pr-4 text-xs text-slate-300 align-top">{t.cause}</td>
                <td className="py-2 text-xs text-slate-300 font-mono align-top whitespace-pre-wrap">{t.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 p-3 bg-slate-900 rounded text-xs text-slate-300">
        <p className="mb-1"><strong>Log files:</strong> Per-job log in <code className="text-xs bg-slate-700 px-1 rounded">jobs/&lt;job_id&gt;/</code>, Gazebo server stderr captured by the subprocess wrapper</p>
        <p className="mb-1"><strong>Reset:</strong> Delete <code className="text-xs bg-slate-700 px-1 rounded">jobs/</code> and <code className="text-xs bg-slate-700 px-1 rounded">worlds/.depot/registry.json</code> to clear all state</p>
      </div>
    </Card>
  );
}
