# Installing Gazebo

Gazebo is a 3D robotics simulator. Think of it as "a video game engine where the player is an AI agent controlling a robot."

## What is Gazebo?

- **Physics engine**: Gravity, collisions, inertia — real-world physics, not approximations
- **Sensors**: Virtual LIDAR, cameras, IMUs, depth sensors, GPS
- **Worlds**: Indoor, outdoor, warehouse, Mars — any 3D environment you can model
- **Robots**: Wheels, arms, drones, humanoids — any robot you can describe
- **Middleware**: `gz-transport` for topic-based communication (like ROS2 but simpler)

Gazebo is what you use when you can't afford to crash a real robot. You test everything in simulation first.

## Editions

| Edition | Status | Notes |
|---------|--------|-------|
| **Gazebo Harmonic** (LTS) | Current | Recommended. Ships with Ubuntu 24.04 |
| **Gazebo Garden** | Previous LTS | Works on Ubuntu 22.04 / WSL2 |
| **Gazebo Classic** (11.x) | Legacy | End of life. Don't use. |

This MCP server targets **Garden** and **Harmonic** — any version with the `gz` CLI.

## Install on Windows (WSL2)

Windows users run Gazebo inside WSL2 (Windows Subsystem for Linux). This is the recommended setup.

### 1. Install WSL2

```powershell
# Admin PowerShell:
wsl --install -d Ubuntu-22.04
# Reboot, then launch Ubuntu from Start menu to complete setup
```

### 2. Install Gazebo Garden

Inside the WSL2 Ubuntu terminal:

```bash
# Add Gazebo repository
sudo curl https://packages.osrfoundation.org/gazebo.gpg --output /usr/share/keyrings/pkgs-osrf-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/pkgs-osrf-archive-keyring.gpg] http://packages.osrfoundation.org/gazebo/ubuntu-stable $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/gazebo-stable.list > /dev/null

# Install
sudo apt update
sudo apt install gz-garden
```

### 3. Verify

```bash
gz sim --version
# Should print: Gazebo Sim, version 8.x.x
```

### 4. Launch a test world

```bash
# Start Gazebo with an empty world
gz sim empty.sdf

# Or start with a pre-built world
gz sim shapes.sdf
```

## Install on Linux (Ubuntu)

### Gazebo Harmonic (Ubuntu 24.04)

```bash
sudo apt update
sudo apt install gz-harmonic
```

### Gazebo Garden (Ubuntu 22.04)

Same as WSL2 instructions above — add the OSRF repo and install `gz-garden`.

## Install on macOS

Gazebo on macOS is possible but limited:

```bash
brew tap osrf/simulation
brew install gz-garden
```

**Note:** GUI (`gz sim`) may not work on macOS. Use headless mode or WSL2 on Windows.

## Testing the CLI

Once installed, the `gz` command should be available:

```bash
gz topic -l              # list topics (empty if no sim running)
gz model --list          # list models
gz service -l            # list services
```

## Common issues

| Problem | Fix |
|---------|-----|
| `gz: command not found` | Gazebo not installed or not on PATH. Verify with `dpkg -l | grep gz-garden` |
| `gz sim` crashes | Try `gz sim -v 4` for debug output. Usually a GPU/driver issue. |
| `gz topic -l` empty | No simulation running. Start one first: `gz sim shapes.sdf` |
| WSL2 can't open GUI | Install an X server (VcXsrv or GWSL) or use Gazebo in headless mode |

## Headless mode (server, no GUI)

For MCP use, Gazebo doesn't need a display. Run without the GUI:

```bash
gz sim -s empty.sdf    # server mode, no GUI
```

MCP tools (`gz_topic_pub`, `gz_topic_list`, etc.) work in headless mode.
