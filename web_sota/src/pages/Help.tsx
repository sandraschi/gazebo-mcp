import { useState } from "react";

const tabs = [
  { id: "prerequisites", label: "Prerequisites" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "architecture", label: "Architecture" },
  { id: "comparison", label: "Gazebo vs Others" },
];

const content: Record<string, string> = {
  prerequisites: `## Prerequisites

### Required
- **Python 3.11+** — tested with 3.12, 3.13
- **Gazebo (Ignition)** — install via binaries or build from source
- **Git** — for cloning the repo

### Recommended
- **uv** — fast Python package manager (\`pip install uv\`)
- **Node.js 20+** — for the web dashboard

### Install
\`\`\`powershell
git clone https://github.com/sandraschi/gazebo-mcp
cd gazebo-mcp
uv sync
uv run python -m gazebo_mcp
\`\`\`

The server starts on port **10991** (FastMCP).`,

  troubleshooting: `## Troubleshooting

### "gz sim not found" on PATH
Install Gazebo (Ignition) from https://gazebosim.org. On Windows,
add the install bin directory to PATH.

### World load fails ("File not found")
Use an absolute path or a valid URL. Supported formats: SDF (.sdf), URDF.

### Simulation crashes on start
Check the stderr output via get_state. Common issues:
- Missing world file
- Invalid SDF/XML
- GPU/rendering driver issues (use headless=true)

### Web dashboard not loading
Ensure both the backend (10991) and Vite dev server (10990) are running.
Check the browser console for proxy errors.

### Port already in use
\`\`\`powershell
Get-NetTCPConnection -LocalPort 10990 | Stop-Process -Id {OwningProcess} -Force
Get-NetTCPConnection -LocalPort 10991 | Stop-Process -Id {OwningProcess} -Force
\`\`\``,

  architecture: `## Architecture

\`\`\`
MCP Client -> FastMCP (port 10991) -> subprocess (gz sim)
                                       -> SDF world loaded
                                       -> physics + sensor loop
                                       -> state via stderr + process info
\`\`\`

### Components
- **FastMCP server** (\`server.py\`) — MCP tools for world loading, sim lifecycle, state queries
- **Gazebo subprocess** — \`gz sim\` or \`ign gazebo\` launched as isolated subprocess
- **JSON IPC** — metadata.json written by the server, control.json for topic commands
- **Web dashboard** — Vite + React SPA on port 10990

### Data Flow
1. User calls \`load_world\` -> SDF stored in \`worlds/\`
2. \`start_sim\` spawns \`gz sim\` as subprocess
3. Gazebo runs physics and sensor simulation
4. \`get_state\` reads process status and metadata
5. \`apply_control\` publishes to Gazebo topics via \`gz topic\`
6. \`stop_sim\` terminates the process`,

  comparison: `## Gazebo vs Other Simulators

| Feature | Gazebo | MuJoCo | Isaac Sim | PyBullet |
|---------|--------|--------|-----------|----------|
| **License** | Apache 2.0 | Apache 2.0 | NVIDIA EULA | MIT |
| **ROS Integration** | Native | No | No | No |
| **Sensor Models** | Full (cam, lidar, IMU, GPS) | Minimal | Full | Basic |
| **Physics Backend** | ODE, DART, Bullet | Native (Newton) | PhysX | Bullet |
| **Python API** | ROS/C++ bridge | Native ctypes | Extension | Native |
| **Speed** | 0.5-1x realtime | 10-50x | 1-5x | 2-10x |
| **Install Size** | ~2 GB | ~10 MB | ~10 GB | ~5 MB |
| **Terrain** | Full with textures | Limited | Full | Procedural |
| **Multi-Robot** | Native | No | Yes | No |
| **Use Case** | Robot-in-the-loop | Robotics control | Photorealistic sim | General robotics |

**Why Gazebo for MCP?** Gazebo is the standard simulation environment for the ROS ecosystem, providing
rich sensor models and physics that match real-world robot behaviour. It is ideal for robot-in-the-loop
testing, sensor validation, and multi-robot coordination.`,

};

export default function Help() {
  const [activeTab, setActiveTab] = useState("prerequisites");

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Help</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-cyan-700 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 prose prose-invert max-w-none">
        {content[activeTab]?.split("\n").map((line, i) => {
          if (line.startsWith("## ")) {
            return <h2 key={i} className="text-xl font-bold mt-6 mb-3 text-white first:mt-0">{line.slice(3)}</h2>;
          }
          if (line.startsWith("### ")) {
            return <h3 key={i} className="text-lg font-semibold mt-4 mb-2 text-cyan-300">{line.slice(4)}</h3>;
          }
          if (line.startsWith("- **")) {
            const boldEnd = line.indexOf("**", 4);
            const label = line.slice(4, boldEnd);
            const rest = line.slice(boldEnd + 2);
            return (
              <div key={i} className="flex gap-2 text-sm text-slate-300 ml-2 mb-1">
                <span className="text-cyan-400 shrink-0">{label}</span>
                <span>{rest.replace(/^ — /, "")}</span>
              </div>
            );
          }
          if (line.startsWith("| ")) {
            return null;
          }
          if (line.startsWith("```")) {
            return null;
          }
          if (line.trim() === "") {
            return <div key={i} className="h-2" />;
          }
          return <p key={i} className="text-sm text-slate-300 mb-2">{line}</p>;
        })}
        {activeTab === "comparison" && (
          <table className="w-full text-sm mt-4 border-collapse">
            <thead>
              <tr className="bg-slate-700">
                {["Feature", "Gazebo", "MuJoCo", "Isaac Sim", "PyBullet"].map((h) => (
                  <th key={h} className="p-2 text-left text-slate-200 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["License", "Apache 2.0", "Apache 2.0", "NVIDIA EULA", "MIT"],
                ["ROS Integration", "Native", "No", "No", "No"],
                ["Sensor Models", "Full", "Minimal", "Full", "Basic"],
                ["Physics Backend", "ODE/DART/Bullet", "Native", "PhysX", "Bullet"],
                ["Python API", "ROS/C++ bridge", "Native ctypes", "Extension", "Native"],
                ["Speed", "0.5-1x realtime", "10-50x", "1-5x", "2-10x"],
                ["Install Size", "~2 GB", "~10 MB", "~10 GB", "~5 MB"],
                ["Terrain", "Full textures", "Limited", "Full", "Procedural"],
                ["Multi-Robot", "Native", "No", "Yes", "No"],
              ].map((row, ri) => (
                <tr key={ri} className="border-t border-slate-700">
                  {row.map((cell, ci) => (
                    <td key={ci} className={`p-2 text-sm ${ci === 0 ? "text-cyan-400 font-medium" : "text-slate-300"}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
