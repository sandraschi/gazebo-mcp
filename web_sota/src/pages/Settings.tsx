import { useState, useEffect } from "react";
import { API_BASE } from "../lib/api";

interface EnvSettings {
  world_dir: string;
  jobs_dir: string;
  world_dir_exists: boolean;
  jobs_dir_exists: boolean;
  gz_available: boolean;
  gz_mode: string | null;
  gz_version: string | null;
  worlds_in_depot: number;
  active_jobs: number;
  platform_windows: boolean;
  backend_port: number;
  frontend_port: number;
}

export default function Settings() {
  const [env, setEnv] = useState<EnvSettings | null>(null);
  const [envError, setEnvError] = useState("");
  const [worldDir, setWorldDir] = useState("");
  const [jobsDir, setJobsDir] = useState("");
  const [toast, setToast] = useState("");

  const [providers, setProviders] = useState<Record<string, any[]>>({});
  const [selectedProvider, setSelectedProvider] = useState("ollama");
  const [selectedModel, setSelectedModel] = useState("");
  const [testResult, setTestResult] = useState("");

  const fetchEnv = async () => {
    try {
      const r = await fetch(API_BASE + "/api/settings");
      if (r.ok) {
        const d = await r.json();
        if (d.settings) {
          setEnv(d.settings);
          setWorldDir(d.settings.world_dir || "");
          setJobsDir(d.settings.jobs_dir || "");
          setEnvError("");
          return;
        }
      }
      setEnvError("Settings API unavailable — is the backend (10991) running?");
    } catch {
      setEnvError("Settings API unreachable — is the backend (10991) running?");
    }
  };

  useEffect(() => {
    fetchEnv();
  }, []);

  useEffect(() => {
    fetch(API_BASE + "/api/llm/providers")
      .then((r) => r.json())
      .then((d) => {
        setProviders(d);
        if (d.ollama?.length) {
          const saved = localStorage.getItem("llm_provider") || "ollama";
          const savedModel = localStorage.getItem("llm_model") || d.ollama[0]?.name || "llama3.2:3b";
          setSelectedProvider(saved);
          setSelectedModel(savedModel);
        }
      })
      .catch(() => setProviders({ ollama: [{name:"llama3.2:3b"}] }));
  }, []);

  const saveLlmConfig = (provider: string, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
    localStorage.setItem("llm_provider", provider);
    localStorage.setItem("llm_model", model);
  };

  const testConnection = async () => {
    setTestResult("Testing...");
    try {
      const r = await fetch(API_BASE + "/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, model: selectedModel, prompt: "Hello, respond with just: OK" }),
      });
      const data = await r.json();
      setTestResult(data.response ? "Connected" : "Failed: " + (data.error || "no response"));
    } catch (e) {
      setTestResult("Error: " + String(e));
    }
  };

  const handleSave = async () => {
    setToast("");
    try {
      const r = await fetch(API_BASE + "/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ world_dir: worldDir, jobs_dir: jobsDir }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        setToast(data.message);
        if (data.settings) setEnv(data.settings);
        setTimeout(() => setToast(""), 5000);
      } else {
        setToast("Failed: " + (data.message || r.statusText));
      }
    } catch (e) {
      setToast(String(e));
    }
  };

  const providerModels = providers[selectedProvider] || providers["ollama"] || [];
  const providerReachable = providers[selectedProvider] ? true : false;

  return (
    <div className="max-w-3xl" data-testid="settings">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-sm text-slate-400 mb-6">
        Live backend environment first, knobs second. Paths save to the running backend session
        (lost on restart) — set env vars for anything permanent.
      </p>

      {toast && (
        <div className="bg-green-900 text-green-300 px-4 py-2 rounded-lg mb-4 text-sm whitespace-pre-wrap">{toast}</div>
      )}

      {/* Live environment — the part that makes this page non-runt */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Environment (live)</h2>
          <button
            onClick={fetchEnv}
            className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-1.5 rounded-lg border border-slate-600"
          >
            Refresh
          </button>
        </div>
        {envError && !env && (
          <div className="text-xs text-yellow-400">{envError}</div>
        )}
        {env ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
              <div className="text-xs text-slate-500 uppercase">Gazebo</div>
              <div className="font-medium mt-0.5 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${env.gz_available ? "bg-green-500" : "bg-red-500"}`} />
                {env.gz_available ? (env.gz_version || "Available") : "Not found"}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono">
                mode: {env.gz_mode || "none"}{env.platform_windows ? " · Windows → expect wsl" : ""}
              </div>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
              <div className="text-xs text-slate-500 uppercase">Depot / Jobs</div>
              <div className="font-medium mt-0.5">{env.worlds_in_depot} worlds · {env.active_jobs} active</div>
              <div className="text-xs text-slate-500 mt-1 font-mono">:{env.backend_port} / :{env.frontend_port}</div>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700 col-span-2">
              <div className="text-xs text-slate-500 uppercase mb-1">Paths in use</div>
              <div className="text-xs font-mono break-all">worlds: {env.world_dir} {env.world_dir_exists ? "" : "(missing)"}</div>
              <div className="text-xs font-mono break-all mt-0.5">jobs: {env.jobs_dir} {env.jobs_dir_exists ? "" : "(missing)"}</div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500">Loading…</div>
        )}
        {!env?.gz_available && (
          <div className="text-xs text-slate-400 bg-slate-900/60 border border-slate-700 rounded-lg p-3">
            No Gazebo found. Windows: install Gazebo inside WSL2 Ubuntu
            (<code className="font-mono">sudo apt install gazebo ignition-fortress</code>), then restart this backend.
            Linux: install Gazebo and ensure <code className="font-mono">gz</code> is on PATH.
            The depot, jobs list, and mesh panel work without Gazebo — only <code className="font-mono">start_sim</code> needs it.
          </div>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
        <h2 className="text-lg font-semibold">Directories</h2>
        <div>
          <label className="block text-xs text-slate-400 mb-1">World depot directory</label>
          <input
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500"
            value={worldDir}
            onChange={(e) => setWorldDir(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Jobs directory</label>
          <input
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500"
            value={jobsDir}
            onChange={(e) => setJobsDir(e.target.value)}
          />
        </div>
        <div className="text-xs text-slate-500">Session-only: the backend creates missing dirs and switches immediately, but forgets on restart.</div>
        <button
          onClick={handleSave}
          className="bg-cyan-700 hover:bg-cyan-600 text-white px-5 py-2 rounded-lg text-sm font-medium"
        >
          Save
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mt-6 space-y-4">
        <h2 className="text-lg font-semibold">Local LLM</h2>
        <p className="text-xs text-slate-400">Select which local LLM provider and model to use for AI tools.</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Provider</label>
            <select
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              value={selectedProvider}
              onChange={(e) => {
                const p = e.target.value;
                const models = providers[p] || [];
                const m = models[0]?.name || "llama3.2:3b";
                saveLlmConfig(p, m);
              }}
            >
              {Object.keys(providers).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Model</label>
            <select
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              value={selectedModel}
              onChange={(e) => saveLlmConfig(selectedProvider, e.target.value)}
            >
              {providerModels.map((m: any) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs">
            <span className={`w-2 h-2 rounded-full ${providerReachable ? "bg-green-500" : "bg-red-500"}`} />
            {selectedProvider}
          </span>
          <button
            onClick={testConnection}
            className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-1.5 rounded-lg border border-slate-600"
          >
            Test Connection
          </button>
          {testResult && (
            <span className={`text-xs ${testResult === "Connected" ? "text-green-400" : "text-yellow-400"}`}>
              {testResult}
            </span>
          )}
        </div>

        <div className="text-xs text-slate-500">
          The LLM page uses these settings. Changes are saved to localStorage and persist across sessions.
        </div>
      </div>
    </div>
  );
}
