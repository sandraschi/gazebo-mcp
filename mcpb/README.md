# ag-gazebo-bridge (MCPB Bundle)

FastMCP 3.2 bridge from Gazebo simulation to fleet robotics mesh

## Usage

Add to \claude_desktop_config.json\:
\\\json
{
  "mcpServers": {
    "ag-gazebo-bridge": {
      "command": "uv",
      "args": ["run", "--directory", "\D:\Dev\repos", "python", "-m", "ag_gazebo_bridge"],
      "env": { "PYTHONPATH": "\D:\Dev\repos/src" }
    }
  }
}
\\\

## Tools

- **gz_topic_pub**: gz_topic_pub

## Requirements

- Python 3.12+
- uv
