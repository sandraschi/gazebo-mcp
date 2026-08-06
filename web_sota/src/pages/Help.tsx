import { PageHero } from "@/components/layout/PageHero";

export default function Help() {
  return (
    <div className="p-6 space-y-6">
      <PageHero
        eyebrow="Support"
        title="Help & Resources"
        lead="Getting started with gazebo-mcp and the robotics fleet."
      />
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-3">
        <p>
          <strong>gazebo-mcp</strong> bridges Gazebo robotics simulation to the
          fleet robotics mesh. Use the MCP tools to control robots in
          simulation, inspect state, and sync to physical hardware or
          visualization tools.
        </p>
        <p>
          <strong>Quick start:</strong> Run <code>just stdio</code> to start the
          MCP server. Connect your MCP client (Claude Desktop, Cursor, OpenCode)
          and use
          <code> gz_sim_state</code> to list simulation models.
        </p>
        <p>
          <strong>Fleet repos:</strong> Ensure target fleet repos are running
          before calling sync tools. Use <code>fleet_status</code> to check
          connectivity.
        </p>
      </div>
    </div>
  );
}
