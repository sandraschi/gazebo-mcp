import { useState, useEffect } from "react";

export default function Settings() {
  const [worldDir, setWorldDir] = useState("");
  const [jobsDir, setJobsDir] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setWorldDir(d.settings.world_dir || "");
          setJobsDir(d.settings.jobs_dir || "");
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      const r = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ world_dir: worldDir, jobs_dir: jobsDir }),
      });
      if (r.ok) {
        setToast("Settings saved (session only).");
        setTimeout(() => setToast(""), 3000);
      } else {
        setToast("Failed to save settings.");
      }
    } catch (e) {
      setToast(String(e));
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {toast && (
        <div className="bg-green-900 text-green-300 px-4 py-2 rounded-lg mb-4 text-sm">{toast}</div>
      )}

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">GAZEBO_WORLD_DIR</label>
          <input
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500"
            value={worldDir}
            onChange={(e) => setWorldDir(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">GAZEBO_JOBS_DIR</label>
          <input
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500"
            value={jobsDir}
            onChange={(e) => setJobsDir(e.target.value)}
          />
        </div>
        <div className="text-xs text-slate-500">Changes persist for the current session only.</div>
        <button
          onClick={handleSave}
          className="bg-cyan-700 hover:bg-cyan-600 text-white px-5 py-2 rounded-lg text-sm font-medium"
        >
          Save
        </button>
      </div>
    </div>
  );
}
