import { useState, useEffect, useCallback } from "react";

interface WorldEntry {
  uri: string;
  path: string;
}

interface FuelModel {
  name: string;
  owner: string;
  model: string;
  tags: string[];
  description: string;
  downloads: number;
  license: string;
  download_url: string;
}

export default function Models() {
  const [worlds, setWorlds] = useState<Record<string, WorldEntry>>({});
  const [name, setName] = useState("");
  const [uri, setUri] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"local" | "fuel">("local");

  const [fuel, setFuel] = useState<FuelModel[]>([]);
  const [fuelSearch, setFuelSearch] = useState("");
  const [fuelTag, setFuelTag] = useState("");
  const [fuelTags, setFuelTags] = useState<string[]>([]);
  const [fuelLoading, setFuelLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchWorlds = useCallback(async () => {
    try {
      const r = await fetch("/api/worlds");
      if (r.ok) {
        const d = await r.json();
        if (d.worlds) setWorlds(d.worlds);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchWorlds(); }, [fetchWorlds]);

  const fetchFuel = useCallback(async () => {
    setFuelLoading(true);
    try {
      const params = new URLSearchParams();
      if (fuelSearch) params.set("search", fuelSearch);
      if (fuelTag) params.set("tag", fuelTag);
      const r = await fetch(`/api/fuel?${params}`);
      if (r.ok) setFuel((await r.json()).models || []);
    } catch {}
    setFuelLoading(false);
  }, [fuelSearch, fuelTag]);

  useEffect(() => {
    if (tab === "fuel") {
      fetchFuel();
      fetch("/api/fuel/tags").then(async r => { if (r.ok) { const d = await r.json(); setFuelTags(d.tags || []); } }).catch(() => {});
    }
  }, [tab, fetchFuel]);

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
        setMessage(`Loaded "${name}".`);
        setName(""); setUri("");
        fetchWorlds();
      } else {
        setMessage(`Error: ${d.error}`);
      }
    } catch (e) { setMessage(String(e)); }
    setLoading(false);
  };

  const handleFuelDownload = async (modelName: string) => {
    setDownloading(modelName);
    setMessage(`Downloading ${modelName}...`);
    try {
      const r = await fetch("/api/fuel/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName }),
      });
      const d = await r.json();
      if (d.success) {
        setMessage(`Loaded "${modelName}".`);
        fetchWorlds();
      } else {
        setMessage(`Error: ${d.error}`);
      }
    } catch (e) { setMessage(String(e)); }
    setDownloading(null);
  };

  const depotNames = new Set(Object.keys(worlds));

  return (
    <div className="max-w-5xl" data-testid="worlds-page">
      <h1 className="text-2xl font-bold mb-6">Worlds</h1>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("local")} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === "local" ? "bg-cyan-700 text-white" : "border border-slate-600 text-slate-400 hover:bg-slate-800"}`}>Local Depot</button>
        <button onClick={() => { setTab("fuel"); }} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === "fuel" ? "bg-cyan-700 text-white" : "border border-slate-600 text-slate-400 hover:bg-slate-800"}`}>Gazebo Fuel</button>
      </div>

      {tab === "local" && (
        <>
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-6" data-testid="load-world-form">
            <h2 className="text-lg font-semibold mb-4">Load New World</h2>
            <div className="flex flex-col gap-3">
              <input className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" placeholder="World name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" placeholder="URL or local file path to .sdf" value={uri} onChange={(e) => setUri(e.target.value)} />
              <div>
                <button onClick={handleLoad} disabled={loading || !name || !uri} className="bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium">{loading ? "Loading..." : "Load World"}</button>
              </div>
            </div>
            {message && <pre className="mt-3 bg-slate-900 rounded-lg p-3 text-xs text-slate-300 whitespace-pre-wrap">{message}</pre>}
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700" data-testid="world-list">
            <h2 className="text-lg font-semibold p-4 border-b border-slate-700">Loaded Worlds ({Object.keys(worlds).length})</h2>
            <div className="divide-y divide-slate-700">
              {Object.keys(worlds).length === 0 && <div className="p-4 text-sm text-slate-500">No worlds loaded.</div>}
              {Object.entries(worlds).map(([name, entry]) => (
                <div key={name} className="p-4">
                  <div className="text-sm font-medium mb-1">{name}</div>
                  <div className="text-xs text-slate-400 mb-2 truncate">{entry.uri}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "fuel" && (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h2 className="text-lg font-semibold mb-4">Gazebo Fuel</h2>
          <p className="text-xs text-slate-400 mb-4">Browse and download worlds from <a href="https://fuel.gazebosim.org" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Gazebo Fuel</a>.</p>

          <div className="flex gap-3 mb-4">
            <input
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              placeholder="Search models by name or description..."
              value={fuelSearch}
              onChange={(e) => setFuelSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchFuel()}
              data-testid="fuel-search"
            />
            <select
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              value={fuelTag}
              onChange={(e) => { setFuelTag(e.target.value); }}
            >
              <option value="">All categories</option>
              {fuelTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {fuelLoading && <div className="text-sm text-slate-400 animate-pulse">Loading...</div>}
          {!fuelLoading && fuel.length === 0 && <div className="text-sm text-slate-500">No models found.</div>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
            {fuel.map((m) => {
              const inDepot = depotNames.has(m.name.replace("/", "_"));
              return (
                <div key={m.name} className={`bg-slate-700 rounded-xl p-4 border ${inDepot ? "border-green-700" : "border-slate-600"} flex flex-col gap-2`}>
                  <div className="text-sm font-medium truncate" title={m.name}>{m.name}</div>
                  {m.description && <div className="text-xs text-slate-400 line-clamp-2">{m.description}</div>}
                  <div className="flex flex-wrap gap-1">
                    {(m.tags || []).slice(0, 3).map((t) => (
                      <span key={t} className="text-xs bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{m.downloads} dl</span>
                    <span className="truncate">{m.license}</span>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    {inDepot ? (
                      <span className="text-xs text-green-400 px-2 py-1">Loaded</span>
                    ) : (
                      <button
                        onClick={() => handleFuelDownload(m.name)}
                        disabled={downloading === m.name}
                        className="bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-600 text-white text-xs px-3 py-1.5 rounded-lg"
                      >
                        {downloading === m.name ? "..." : "Download"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {message && <pre className="mt-3 bg-slate-900 rounded-lg p-3 text-xs text-slate-300 whitespace-pre-wrap">{message}</pre>}
        </div>
      )}
    </div>
  );
}
