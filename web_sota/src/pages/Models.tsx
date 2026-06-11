import { useState, useEffect, useCallback } from "react";

interface WorldEntry {
  uri: string;
  path: string;
}

export default function Models() {
  const [worlds, setWorlds] = useState<Record<string, WorldEntry>>({});
  const [name, setName] = useState("");
  const [uri, setUri] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchWorlds = useCallback(async () => {
    try {
      const r = await fetch("/api/worlds");
      if (r.ok) {
        const d = await r.json();
        if (d.worlds) setWorlds(d.worlds);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchWorlds();
  }, [fetchWorlds]);

  const handleLoad = async () => {
    if (!name || !uri) return;
    setLoading(true);
    setMessage("");
    try {
      const r = await fetch("/api/worlds/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, uri }),
      });
      const d = await r.json();
      if (d.success) {
        setMessage(`Loaded world "${name}" successfully.`);
        setName("");
        setUri("");
        fetchWorlds();
      } else {
        setMessage(`Error: ${d.error}`);
      }
    } catch (e) {
      setMessage(String(e));
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Worlds</h1>

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-6">
        <h2 className="text-lg font-semibold mb-4">Load New World</h2>
        <div className="flex flex-col gap-3">
          <input
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="World name (e.g. my_world)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="URL or local file path to .sdf"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
          />
          <div>
            <button
              onClick={handleLoad}
              disabled={loading || !name || !uri}
              className="bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {loading ? "Loading..." : "Load World"}
            </button>
          </div>
        </div>
        {message && (
          <pre className="mt-3 bg-slate-900 rounded-lg p-3 text-xs text-slate-300 whitespace-pre-wrap">
            {message}
          </pre>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <h2 className="text-lg font-semibold p-4 border-b border-slate-700">
          Loaded Worlds ({Object.keys(worlds).length})
        </h2>
        <div className="divide-y divide-slate-700">
          {Object.keys(worlds).length === 0 && (
            <div className="p-4 text-sm text-slate-500">No worlds loaded.</div>
          )}
          {Object.entries(worlds).map(([name, entry]) => (
            <div key={name} className="p-4">
              <div className="text-sm font-medium mb-1">{name}</div>
              <div className="text-xs text-slate-400 mb-2 truncate">{entry.uri}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
