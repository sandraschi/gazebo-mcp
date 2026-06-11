"""FastAPI backend for the gazebo-mcp web dashboard."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from gazebo_mcp.server import sim_status, list_worlds, list_jobs, load_world, start_sim, stop_sim, get_state
from web_sota.backend.routes.ai import router as ai_router

app = FastAPI(title="gazebo-mcp")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)


@app.get("/health")
@app.get("/api/health")
async def health():
    return sim_status()


@app.get("/api/status")
async def status():
    return sim_status()


@app.get("/api/worlds")
async def worlds():
    return list_worlds()


@app.get("/api/simulations")
async def simulations():
    return list_jobs()


@app.post("/api/simulations/start")
async def sim_start(body: dict):
    return start_sim(world_name=body.get("world_name", ""), headless=body.get("headless", True), extra_args=body.get("extra_args", ""))


@app.post("/api/simulations/stop")
async def sim_stop(body: dict):
    return stop_sim(job_id=body.get("job_id", ""))


@app.get("/api/simulations/{job_id}/state")
async def sim_state(job_id: str):
    return get_state(job_id=job_id)


@app.post("/api/worlds/load")
async def world_load(body: dict):
    return load_world(uri=body.get("uri", ""), name=body.get("name", ""))


@app.get("/api/llm/providers")
async def llm_providers():
    import httpx
    try:
        r = httpx.get("http://127.0.0.1:11434/api/tags", timeout=3)
        return {"ollama": r.json().get("models", [{"name": "llama3.2:3b"}])}
    except Exception:
        return {"ollama": [{"name": "llama3.2:3b"}]}


@app.post("/api/llm/chat")
async def llm_chat(body: dict):
    import httpx
    try:
        resp = httpx.post(
            "http://127.0.0.1:11434/api/generate",
            json={"model": body.get("model", "llama3.2:3b"), "prompt": body.get("prompt", ""), "stream": False},
            timeout=60,
        )
        return resp.json()
    except Exception as e:
        return {"error": str(e)}


# Mount MCP HTTP
mcp_mod = __import__("gazebo_mcp.server", fromlist=["mcp"])
app.mount("/mcp", mcp_mod.mcp.http_app())

# Serve frontend static files (if dist exists)
dist = Path(__file__).resolve().parent.parent / "dist"
if dist.is_dir():
    app.mount("/", StaticFiles(directory=str(dist), html=True), name="frontend")


def run_dev() -> None:
    import uvicorn
    uvicorn.run("web_sota.backend.server:app", host="127.0.0.1", port=10991, log_level="info", reload=True)


if __name__ == "__main__":
    run_dev()
