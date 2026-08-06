import { PageHero } from "@/components/layout/PageHero";

const FLEET_PORTS = [
  { name: "robotics-mcp", port: "10706" },
  { name: "yahboom-mcp", port: "10893" },
  { name: "unity3d-mcp", port: "10831" },
  { name: "resonite-mcp", port: "10979" },
  { name: "freecad-mcp", port: "10945" },
];

export default function Settings() {
  return (
    <div className="p-6 space-y-6">
      <PageHero
        eyebrow="Configuration"
        title="Fleet Ports"
        lead="Connected fleet repos and their default ports. Configure via environment variables."
      />
      <div className="grid gap-2">
        {FLEET_PORTS.map((r) => (
          <div
            key={r.name}
            className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3"
          >
            <span className="font-medium">{r.name}</span>
            <code className="text-sm text-muted-foreground">:{r.port}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
