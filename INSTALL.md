# gazebo-mcp — Install Guide

## Prerequisites

- Python 3.11+ with [uv](https://docs.astral.sh/uv/)
- [Gazebo](https://gazebosim.org) Garden or Harmonic (see [docs/INSTALL_GAZEBO.md](docs/INSTALL_GAZEBO.md))
- Windows: Gazebo via WSL2 (see docs)
- Linux/macOS: native `gz` CLI on PATH

## Quick install

```powershell
git clone https://github.com/sandraschi/gazebo-mcp.git
cd gazebo-mcp
just install
just install-mcp claude
```

## Manual install

```powershell
uv sync
just install-mcp claude
```

## Start

```powershell
just stdio           # MCP server (stdio)
```

## Verify

```powershell
just models          # list Gazebo models
just fleet           # check fleet connectivity
```

## Web dashboard

```powershell
just dev             # start Vite dashboard on :10990
```

## Known issues

- Gazebo must be on PATH (or in WSL on Windows).
- Fleet repos must be running before sync tools will work.
