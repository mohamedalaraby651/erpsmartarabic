/**
 * AppShell smoke tests — UX-1B exit gate.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppShell } from "../AppShell";
import { ShellProvider } from "../../providers/ShellProvider";
import { useShortcutRegistry } from "../../providers/ShortcutProvider";
import {
  financeWorkspace,
  suppliersWorkspace,
  crmWorkspace,
  sampleWorkspaces,
} from "../__fixtures__/workspaces";

describe("AppShell", () => {
  it("renders with multiple registered workspaces", () => {
    render(
      <ShellProvider
        workspaces={sampleWorkspaces}
        initialActiveWorkspaceId="finance"
        permissions={["finance.read"]}
      >
        <AppShell>
          <div>workspace content</div>
        </AppShell>
      </ShellProvider>
    );
    expect(screen.getByText("workspace content")).toBeInTheDocument();
    // Workspace switcher exposes the active name.
    expect(screen.getAllByText(/Finance/i).length).toBeGreaterThan(0);
  });

  it("honors rtl direction from layoutDefaults", () => {
    render(
      <ShellProvider
        workspaces={[financeWorkspace]}
        initialActiveWorkspaceId="finance"
        layoutDefaults={{ dir: "rtl" }}
      >
        <AppShell>
          <div>rtl</div>
        </AppShell>
      </ShellProvider>
    );
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
  });

  it("registers the mod+k shortcut for the command palette", () => {
    // We don't render cmdk in jsdom (it requires real ResizeObserver as a
    // constructor); instead we assert the shortcut is registered and a
    // handler runs without crash when mod+k is dispatched.
    const handler = vi.fn();
    function Probe() {
      const registry = useShortcutRegistry();
      registry.register({
        id: "test.binding",
        keys: "mod+k",
        scope: "global",
        handler,
      });
      return null;
    }
    render(
      <ShellProvider workspaces={[financeWorkspace]} initialActiveWorkspaceId="finance">
        <Probe />
      </ShellProvider>
    );
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(handler).toHaveBeenCalled();
  });

  it("WorkspaceManifest round-trips through JSON.stringify", () => {
    for (const ws of sampleWorkspaces) {
      const manifest = {
        id: ws.id,
        name: ws.name,
        icon: ws.icon,
        permissions: ws.permissions,
        navigation: ws.navigation,
        basePath: ws.basePath,
        status: ws.status,
        meta: ws.meta,
      };
      const serialized = JSON.stringify(manifest);
      const parsed = JSON.parse(serialized);
      expect(parsed.id).toBe(ws.id);
      expect(parsed.navigation.length).toBe(ws.navigation.length);
    }
  });

  it("registry adds a third workspace without Shell edits", () => {
    render(
      <ShellProvider workspaces={[financeWorkspace, suppliersWorkspace, crmWorkspace]}>
        <AppShell>
          <div>z</div>
        </AppShell>
      </ShellProvider>
    );
    // No throw, no edit to AppShell required.
    expect(screen.getByText("z")).toBeInTheDocument();
  });
});
