"""Tests for gazebo-mcp."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from ag_gazebo_bridge.server import _fleet_health, _gz_run


@pytest.mark.asyncio
class TestFleetHealth:
    async def test_fleet_health_up(self, respx_mock):
        respx_mock.get("http://127.0.0.1:10893/health").respond(200, json={"status": "ok"})
        assert await _fleet_health("yahboom", "http://127.0.0.1:10893") is True

    async def test_fleet_health_down(self, respx_mock):
        respx_mock.get("http://127.0.0.1:10893/health").respond(503)
        assert await _fleet_health("yahboom", "http://127.0.0.1:10893") is False

    async def test_fleet_health_timeout(self, respx_mock):
        respx_mock.get("http://127.0.0.1:10893/health").mock(side_effect=TimeoutError())
        assert await _fleet_health("yahboom", "http://127.0.0.1:10893") is False


@pytest.mark.asyncio
class TestGzRun:
    @patch("asyncio.create_subprocess_exec")
    async def test_gz_run_success(self, mock_exec):
        mock_proc = AsyncMock()
        mock_proc.returncode = 0
        mock_proc.communicate.return_value = (b"scout\nwarehouse\n", b"")
        mock_proc.communicate = AsyncMock(return_value=(b"scout\nwarehouse\n", b""))
        mock_proc.wait = AsyncMock()
        mock_exec.return_value = mock_proc

        ok, output = await _gz_run("model", "--list")
        assert ok is True
        assert "scout" in output

    async def test_gz_not_installed(self):
        ok, output = await _gz_run("model", "--list")
        if not ok:
            assert "not found" in output.lower() or "gazebo" in output.lower()

    async def test_gz_timeout(self):
        import asyncio
        async def slow(*args, **kwargs):
            await asyncio.sleep(20)
            return (b"", b"")

        with patch("asyncio.create_subprocess_exec") as mock_exec:
            mock_proc = AsyncMock()
            mock_proc.communicate = slow
            mock_exec.return_value = mock_proc
            ok, output = await _gz_run("model", "--list")
            assert ok is False
            assert "timed out" in output.lower()
