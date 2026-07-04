"""PyInstaller entry point — dual transport (stdio or HTTP)."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
port = os.environ.get("GAZEBO_MCP_PORT") or os.environ.get("MCP_PORT")
if port:
    host = os.environ.get("GAZEBO_MCP_HOST", "127.0.0.1")
    import uvicorn
    from web_sota.backend.server import app
    uvicorn.run(app, host=host, port=int(port), log_level="info")
else:
    from gazebo_mcp.server import main
    main()
