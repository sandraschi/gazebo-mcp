"""Tests for gazebo-mcp server tools."""

from pathlib import Path
from typing import Any

import pytest

from gazebo_mcp.server import (
    sim_status,
    list_worlds,
    list_jobs,
)


@pytest.fixture
def empty_depot(tmp_path: Path) -> Any:
    """Patch WORLD_DIR and JOBS_DIR to temp dirs."""
    import gazebo_mcp.server as srv

    original_world = srv.WORLD_DIR
    original_jobs = srv.JOBS_DIR
    original_depot = srv.DEPOT_FILE

    srv.WORLD_DIR = tmp_path / "worlds"
    srv.JOBS_DIR = tmp_path / "jobs"
    srv.DEPOT_FILE = srv.WORLD_DIR / ".depot" / "registry.json"
    srv.WORLD_DIR.mkdir(parents=True, exist_ok=True)
    srv.JOBS_DIR.mkdir(parents=True, exist_ok=True)
    srv.DEPOT_FILE.parent.mkdir(parents=True, exist_ok=True)

    srv._save_depot({})

    yield

    srv.WORLD_DIR = original_world
    srv.JOBS_DIR = original_jobs
    srv.DEPOT_FILE = original_depot


class TestSimStatus:
    def test_sim_status_returns_dict(self):
        result = sim_status()
        assert isinstance(result, dict)
        assert "gz_available" in result

    def test_sim_status_keys(self):
        result = sim_status()
        expected_keys = {
            "gz_available", "gz_version",
            "world_dir_exists", "worlds_in_depot",
            "active_jobs", "jobs_dir_exists",
        }
        assert expected_keys.issubset(result.keys())


class TestListWorlds:
    def test_list_worlds_empty(self, empty_depot):
        result = list_worlds()
        assert result["success"] is True
        assert result["count"] == 0
        assert isinstance(result["worlds"], dict)

    def test_list_worlds_success(self, empty_depot):
        result = list_worlds()
        assert result["success"] is True


class TestListJobs:
    def test_list_jobs_empty(self, empty_depot):
        result = list_jobs()
        assert result["success"] is True
        assert result["total"] == 0
        assert isinstance(result["active"], list)
        assert isinstance(result["completed"], list)


class TestLoadWorld:
    def test_load_world_file_not_found(self, empty_depot):
        from gazebo_mcp.server import load_world
        result = load_world(uri="/nonexistent/file.sdf", name="test_world")
        assert result["success"] is False
        assert "error" in result

    def test_load_world_success(self, empty_depot, tmp_path):
        from gazebo_mcp.server import load_world, list_worlds

        sdf_content = '<?xml version="1.0"?>\n<sdf version="1.6">\n  <world name="default">\n    <include>\n      <uri>model://ground_plane</uri>\n    </include>\n  </world>\n</sdf>'

        sdf_path = tmp_path / "test_world.sdf"
        sdf_path.write_text(sdf_content)

        result = load_world(uri=str(sdf_path), name="test_world")
        assert result["success"] is True
        assert result["name"] == "test_world"

        worlds = list_worlds()
        assert worlds["count"] == 1
        assert "test_world" in worlds["worlds"]


class TestStartStopSim:
    def test_start_sim_no_such_world(self, empty_depot):
        from gazebo_mcp.server import start_sim
        result = start_sim(world_name="nonexistent", headless=True)
        assert result["success"] is False
        assert "error" in result

    def test_stop_sim_unknown_job(self, empty_depot):
        from gazebo_mcp.server import stop_sim
        result = stop_sim(job_id="bad_job_id")
        assert result["success"] is False


class TestAiTools:
    @pytest.mark.asyncio
    async def test_agentic_workflow_ollama_fallback(self, empty_depot):
        from gazebo_mcp.server import agentic_sim_workflow
        result = await agentic_sim_workflow(goal="test", ctx=None)
        assert "success" in result

    @pytest.mark.asyncio
    async def test_discover_model_no_llm(self, empty_depot):
        from gazebo_mcp.server import discover_model
        result = await discover_model(description="test", ctx=None)
        assert "success" in result

    @pytest.mark.asyncio
    async def test_nl_control_unknown_job(self, empty_depot):
        from gazebo_mcp.server import natural_language_control
        result = await natural_language_control(prompt="test", job_id="bad_id", ctx=None)
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_analyze_state_unknown_job(self, empty_depot):
        from gazebo_mcp.server import analyze_sim_state
        result = await analyze_sim_state(job_id="bad_id", ctx=None)
        assert result["success"] is False
