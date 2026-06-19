/**
 * ShellDemo — standalone, NOT routed. Demonstrates the Shell driving
 * three independent workspaces (finance, suppliers, crm) registered as
 * pure data. Proves "zero shell edits" required to add a new workspace.
 */
import { useState } from "react";
import { AppShell } from "../AppShell";
import { ShellProvider } from "../../providers/ShellProvider";
import { sampleWorkspaces } from "../__fixtures__/workspaces";
import type { ShellUser } from "../types";

const demoUser: ShellUser = {
  id: "demo-user",
  name: "Demo User",
  email: "demo@example.com",
};

export function ShellDemo() {
  const [activeId] = useState<"finance" | "suppliers" | "crm">("finance");
  return (
    <ShellProvider
      workspaces={sampleWorkspaces}
      initialActiveWorkspaceId={activeId}
      permissions={["finance.read", "suppliers.read", "crm.read"]}
      user={demoUser}
    >
      <AppShell>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">UI Shell demo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Switch workspaces from the topbar. Press ⌘K / Ctrl+K for the
            command palette.
          </p>
        </div>
      </AppShell>
    </ShellProvider>
  );
}

export default ShellDemo;
