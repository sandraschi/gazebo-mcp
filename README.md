# ag-gazebo-bridge

[![FastMCP Version](https://img.shields.io/badge/FastMCP-3.1.0-blue?style=flat-square&logo=python&logoColor=white)](https://github.com/sandraschi/fastmcp)

MCP server for bridging Gazebo Harmonic/Jetty `gz-transport` to AI agents.

## Features
- **Publish to Topics**: Control simulation elements via Gazebo Transport.
- **Sim State Observation**: List and inspect models in the simulation.

## Prerequisites
- Gazebo Harmonic or Jetty installed.
- Python 3.10+.

## 🚀 Installation

### Prerequisites
- [uv](https://docs.astral.sh/uv/) installed (RECOMMENDED)
- Python 3.12+

### 📦 Quick Start
Run immediately via `uvx`:
```bash
uvx ag-gazebo-bridge
```

### 🎯 Claude Desktop Integration
Add to your `claude_desktop_config.json`:
```json
"mcpServers": {
  "ag-gazebo-bridge": {
    "command": "uv",
    "args": ["--directory", "D:/Dev/repos/ag-gazebo-bridge", "run", "ag-gazebo-bridge"]
  }
}
```
## Usage
Run the MCP server:
```bash
python -m ag_gazebo_bridge.server
```
