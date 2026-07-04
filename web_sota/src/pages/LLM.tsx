import { useCallback, useEffect, useRef, useState } from "react";

const HISTORY_KEY = "gazebo-mcp-chat-history";
const PERSONALITY_KEY = "gazebo-mcp-chat-personality";
const MAX_HISTORY = 100;

const PERSONALITIES: Record<string, string> = {
	"Research Assistant": "You are a research assistant specializing in Gazebo simulation and robotics. Answer concisely with relevant technical details.",
	"Expert Reviewer": "You are a senior robotics engineer reviewing simulation results. Be critical and thorough.",
	"Quick Summarizer": "Keep responses to 2-3 sentences. Focus on key facts and numbers.",
	"Custom": "Custom prompt — editable below.",
};

const quickActions = [
	{ title: "Run Workflow", prompt: "Plan and execute: load a world and start a simulation" },
	{ title: "Analyze State", prompt: "What is the current state of all active simulations?" },
	{ title: "NL Control", prompt: "Send a movement command to a robot in the running simulation" },
	{ title: "Discover Model", prompt: "Suggest which Gazebo model to test for sensor simulation" },
	{ title: "Status Check", prompt: "Check the health of the Gazebo server" },
	{ title: "Debug Logs", prompt: "Read the runner logs and diagnose any issues" },
];

interface ChatMessage {
	role: "user" | "assistant";
	content: string;
	ts?: string;
}

function loadHistory(): ChatMessage[] {
	try { const raw = localStorage.getItem(HISTORY_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

function buildSystemPrompt(personalityId: string, customPrompt: string): string {
	const skill = "You have access to a Gazebo simulation server with 14 tools. You can load worlds, spawn models, control topics, run simulations, and use AI workflows.";
	const role = PERSONALITIES[personalityId] || PERSONALITIES["Research Assistant"];
	if (personalityId === "Custom") return customPrompt || skill;
	return `${skill}\n\n---\n\n## Role\n${role}`;
}

export default function LLM() {
	const [chat, setChat] = useState<ChatMessage[]>(() => loadHistory());
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [providers, setProviders] = useState<Record<string, any[]>>({});
	const [selectedProvider, setSelectedProvider] = useState("ollama");
	const [selectedModel, setSelectedModel] = useState("llama3.2:3b");
	const [personality, setPersonality] = useState(() => localStorage.getItem(PERSONALITY_KEY) || "Research Assistant");
	const [customPrompt, setCustomPrompt] = useState("");
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const savedProvider = localStorage.getItem("llm_provider") || "ollama";
		const savedModel = localStorage.getItem("llm_model") || "llama3.2:3b";
		setSelectedProvider(savedProvider);
		setSelectedModel(savedModel);
		fetch("/api/llm/providers")
			.then((r) => r.json())
			.then((d) => {
				setProviders(d);
				if (d.ollama?.length) {
					const names = d.ollama.map((m: { name: string }) => m.name);
					if (names.length > 0 && !names.includes(savedModel)) setSelectedModel(names[0]);
				}
			})
			.catch(() => setProviders({ ollama: [{ name: "llama3.2:3b" }] }));
	}, []);

	useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

	const sendMessage = useCallback(async (prompt: string) => {
		const userMsg: ChatMessage = { role: "user", content: prompt, ts: new Date().toISOString() };
		setChat((prev) => { const next = [...prev, userMsg]; localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(-MAX_HISTORY))); return next; });
		setLoading(true);
		try {
			const r = await fetch("/api/llm/chat", {
				method: "POST", headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ provider: selectedProvider, model: selectedModel, prompt, system: buildSystemPrompt(personality, customPrompt) }),
			});
			const data = await r.json();
			const reply = data.response || data.error || "No response";
			const assistantMsg: ChatMessage = { role: "assistant", content: reply, ts: new Date().toISOString() };
			setChat((prev) => { const next = [...prev, assistantMsg]; localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(-MAX_HISTORY))); return next; });
		} catch (e) {
			setChat((prev) => { const next = [...prev, { role: "assistant" as const, content: String(e), ts: new Date().toISOString() }]; localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(-MAX_HISTORY))); return next; });
		}
		setLoading(false);
	}, [selectedProvider, selectedModel, personality, customPrompt]);

	const handleSend = () => { if (!input.trim()) return; sendMessage(input.trim()); setInput(""); };
	const handleClear = () => { setChat([]); localStorage.removeItem(HISTORY_KEY); };
	const handleExport = () => {
		if (chat.length === 0) return;
		const blob = new Blob([chat.map((m) => `[${m.ts || "no-ts"}] ${m.role}: ${m.content}`).join("\n")], { type: "text/plain" });
		const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `gazebo-mcp-chat-${new Date().toISOString().slice(0, 10)}.txt`; a.click();
	};

	const providerModels = providers[selectedProvider] || providers["ollama"] || [];

	return (
		<div data-testid="chat-page" className="max-w-5xl">
			<h1 className="text-2xl font-bold mb-6">LLM Interface</h1>
			<div data-testid="chat-controls" className="mb-4 flex gap-4 items-end flex-wrap">
				<div>
					<label className="text-xs text-slate-400 mr-2">Provider:</label>
					<select className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm" value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}>
						{Object.keys(providers).map((p) => <option key={p} value={p}>{p}</option>)}
					</select>
				</div>
				<div>
					<label className="text-xs text-slate-400 mr-2">Model:</label>
					<select className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
						{providerModels.map((m: any) => <option key={m.name} value={m.name}>{m.name}</option>)}
					</select>
				</div>
				<div>
					<label className="text-xs text-slate-400 mr-2">Personality:</label>
					<select data-testid="personality-select" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm" value={personality} onChange={(e) => { setPersonality(e.target.value); localStorage.setItem(PERSONALITY_KEY, e.target.value); }}>
						{Object.keys(PERSONALITIES).map((p) => <option key={p} value={p}>{p}</option>)}
					</select>
				</div>
				<div className="flex gap-2 ml-auto">
					<button data-testid="chat-export" onClick={handleExport} disabled={chat.length === 0} className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-xs px-3 py-1.5 rounded-lg border border-slate-600">Export</button>
					<button data-testid="chat-clear" onClick={handleClear} disabled={chat.length === 0} className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-xs px-3 py-1.5 rounded-lg border border-slate-600">Clear</button>
				</div>
			</div>

			{personality === "Custom" && (
				<textarea className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm mb-4" rows={2} placeholder="Enter your custom system prompt..." value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
			)}

			<div className="grid grid-cols-3 gap-3 mb-6" data-testid="example-prompts">
				{quickActions.map((action) => (
					<button key={action.title} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-left hover:border-cyan-600 transition-colors" onClick={() => sendMessage(action.prompt)}>
						<div className="text-sm font-medium mb-1">{action.title}</div>
						<div className="text-xs text-slate-400 line-clamp-2">{action.prompt}</div>
					</button>
				))}
			</div>

			<div className="bg-slate-800 rounded-xl border border-slate-700">
				<div data-testid="chat-messages" className="h-80 overflow-auto p-4 space-y-3">
					{chat.length === 0 && <div className="text-slate-500 text-sm text-center pt-8">Click an example prompt or type a message.</div>}
					{chat.map((msg, i) => (
						<div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
							<div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-cyan-800 text-cyan-100" : "bg-slate-700 text-slate-200"}`}>{msg.content}</div>
						</div>
					))}
					{loading && <div className="flex justify-start"><div className="bg-slate-700 rounded-xl px-4 py-2 text-sm text-slate-400 animate-pulse">Thinking...</div></div>}
					<div ref={bottomRef} />
				</div>
				<div className="border-t border-slate-700 p-3 flex gap-2">
					<input data-testid="chat-input" className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" placeholder="Ask something..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} />
					<button data-testid="chat-send" onClick={handleSend} disabled={loading || !input.trim()} className="bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Send</button>
				</div>
			</div>
		</div>
	);
}
