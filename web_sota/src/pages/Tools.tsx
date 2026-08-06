import { PageHero } from "@/components/layout/PageHero";

const TOOLS = [
  { name: "gz_topic_pub", desc: "Publish to a Gazebo simulation topic" },
  { name: "gz_topic_list", desc: "List active Gazebo topics" },
  { name: "gz_sim_state", desc: "List models in the simulation" },
  { name: "gz_service_call", desc: "Call a Gazebo service" },
  { name: "sync_to_yahboom", desc: "Push robot command to physical Yahboom" },
  { name: "sync_to_unity", desc: "Export scene to Unity 3D" },
  { name: "sync_to_resonite", desc: "Spawn models in Resonite VR" },
  { name: "sync_to_freecad", desc: "Export model to FreeCAD" },
  { name: "fleet_sync_all", desc: "Broadcast to all connected fleet repos" },
  { name: "fleet_status", desc: "Health check all connected fleet repos" },
];

export default function Tools() {
  return (
    <div className="p-6 space-y-6">
      <PageHero
        eyebrow="Available tools"
        title="MCP Tools"
        lead="Gazebo simulation bridge exposes these tools to AI agents."
      />
      <div className="grid gap-2">
        {TOOLS.map((t) => (
          <div
            key={t.name}
            className="flex items-start gap-3 rounded-lg border border-border/40 px-4 py-3"
          >
            <code className="text-sm font-medium text-primary shrink-0">
              {t.name}
            </code>
            <span className="text-sm text-muted-foreground">{t.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
