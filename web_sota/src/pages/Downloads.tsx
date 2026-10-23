import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../lib/api";

interface WorldEntry {
  uri: string;
  path: string;
}

const FREE_SOURCES = [
  {
    name: "Gazebo Fuel",
    url: "https://app.gazebosim.org/fuel",
    desc: "Official model + world library (Apache/CC). Search on the Worlds page Fuel tab, or paste a model.sdf URL below.",
  },
  {
    name: "OpenRobotics Fuel collection",
    url: "https://app.gazebosim.org/OpenRobotics",
    desc: "Empty warehouses, demo worlds, Thrall, TurtleBot3. Paste any model.sdf / world .sdf URL to download.",
  },
  {
    name: "gz-sim example worlds (GitHub)",
    url: "https://github.com/gazebosim/gz-sim/tree/main/examples/worlds",
    desc: "Raw .sdf via raw.githubusercontent.com — e.g. …/examples/worlds/empty.sdf. Free, versioned, no login.",
  },
  {
    name: "Classic gazebo_models (GitHub)",
    url: "https://github.com/osrf/gazebo_models",
    desc: "Hundreds of SDF models for Gazebo Classic — most load in Garden/Harmonic, occasionally need a tag tweak.",
  },
];

export default function Downloads() {
  const [worlds, setWorlds] = useState<Record<string, WorldEntry>>({});
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [uri, setUri] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fetchWorlds = useCallback(async () => {
    try {
      const r = await fetch(API_BASE + "/api/worlds");
      if (r.ok) setWorlds((await r.json()).worlds || {});
    } catch {}
  }, []);

  useEffect(() => {
    fetchWorlds();
  }, [fetchWorlds]);

  const download = async () => {
    if (!name || !uri) return;
    setBusy("load");
    setMsg("");
    try {
      const r = await fetch(API_BASE + "/api/worlds/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, uri }),
      });
      const d = await r.json();
      setMsg(d.success ? `Downloaded "${name}".` : "Failed: " + (d.error || r.statusText));
      if (d.success) {
        setName("");
        setUri("");
        fetchWorlds();
      }
    } catch (e) {
      setMsg("Error: " + String(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (w: string) => {
    if (!confirm(`Delete "${w}" from the depot (file + registry)?`)) return;
    setBusy("del:" + w);
    setMsg("");
    try {
      const r = await fetch(API_BASE + "/api/worlds/" + encodeURIComponent(w), { method: "DELETE" });
      const d = await r.json();
      setMsg(d.success ? `Deleted "${w}".` : "Failed: " + (d.error || r.statusText));
      fetchWorlds();
    } catch (e) {
      setMsg("Error: " + String(e));
    } finally {
      setBusy(null);
    }
  };

  const rename = async (oldName: string) => {
    if (!renameValue) return;
    setBusy("ren:" + oldName);
    setMsg("");
    try {
      const r = await fetch(API_BASE + "/api/worlds/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_name: oldName, new_name: renameValue }),
      });
      const d = await r.json();
      setMsg(d.success ? `Renamed to "${d.new_name}".` : "Failed: " + (d.error || r.statusText));
      setRenameTarget(null);
      setRenameValue("");
      fetchWorlds();
    } catch (e) {
      setMsg("Error: " + String(e));
    } finally {
      setBusy(null);
    }
  };

  const names = Object.keys(worlds).filter((w) => w.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-4xl" data-testid="downloads">
      <h1 className="text-2xl font-bold mb-2">Downloads</h1>
      <p className="text-sm text-slate-400 mb-6">
        Pull free worlds and models off the web into your depot — then search, rename, delete. Full CRUD, no CLI.
      </p>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-1">Download from URL</h2>
        <p className="text-xs text-slate-500 mb-3">Any direct <code className="font-mono">.sdf</code> / <code className="font-mono">.world</code> link — Fuel, GitHub raw, your own server.</p>
        <div className="flex gap-3 flex-wrap">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="depot name (e.g. warehouse)"
            className="flex-1 min-w-40 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500"
          />
          <input
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="https://…/model.sdf"
            className="flex-[2] min-w-60 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={download}
            disabled={busy !== null || !name || !uri}
            data-testid="downloads-fetch"
            className="bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            {busy === "load" ? "Fetching…" : "Download"}
          </button>
        </div>
        {msg && <div className="mt-3 text-xs text-slate-300">{msg}</div>}
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-1">Free sources</h2>
        <p className="text-xs text-slate-500 mb-3">Copy a URL from any of these, paste it above. All free, most no-login.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FREE_SOURCES.map((s) => (
            <div key={s.name} className="bg-slate-900/60 rounded-xl p-4 border border-slate-700">
              <a href={s.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-cyan-300 hover:underline">
                {s.name} →
              </a>
              <div className="text-xs text-slate-400 mt-1 font-mono break-all">{s.url}</div>
              <div className="text-xs text-slate-400 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">Depot ({names.length})</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search depot…"
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="divide-y divide-slate-700">
          {names.length === 0 && <div className="p-4 text-sm text-slate-500">Depot empty (or nothing matches). Download something above.</div>}
          {names.map((w) => (
            <div key={w} className="p-4 text-sm">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <span className="font-mono text-cyan-300 text-xs">{w}</span>
                  <div className="text-xs text-slate-500 truncate font-mono">{worlds[w]?.path}</div>
                </div>
                <div className="flex gap-2">
                  {renameTarget === w ? (
                    <>
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        placeholder="new name"
                        className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-cyan-500"
                      />
                      <button onClick={() => rename(w)} disabled={busy !== null} className="text-xs bg-cyan-700 hover:bg-cyan-600 text-white px-3 py-1 rounded-lg">Save</button>
                      <button onClick={() => setRenameTarget(null)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-lg border border-slate-600">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setRenameTarget(w); setRenameValue(w); }}
                        className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-lg border border-slate-600"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => remove(w)}
                        disabled={busy !== null}
                        data-testid={`downloads-delete-${w}`}
                        className="text-xs bg-red-900/60 hover:bg-red-800 text-red-300 px-3 py-1 rounded-lg border border-red-800"
                      >
                        {busy === "del:" + w ? "…" : "Delete"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
