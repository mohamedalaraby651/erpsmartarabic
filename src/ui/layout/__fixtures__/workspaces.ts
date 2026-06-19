/**
 * Sample workspaces used to verify the Plugin pattern.
 *
 * UX-1B exit gate: each `.manifest` (the WorkspaceManifest portion of the
 * definition) must round-trip through `JSON.stringify` without loss.
 */
import type { WorkspaceDefinition } from "../types";

export const financeWorkspace: WorkspaceDefinition = {
  id: "finance",
  name: "Finance",
  icon: "Wallet",
  basePath: "/finance",
  permissions: ["finance.read"],
  navigation: [
    {
      id: "finance.overview",
      type: "link",
      title: "Overview",
      icon: "LayoutDashboard",
      to: "/finance",
      order: 0,
    },
    {
      id: "finance.invoices",
      type: "group",
      title: "Invoices",
      icon: "Receipt",
      order: 10,
      children: [
        {
          id: "finance.invoices.list",
          type: "link",
          title: "All invoices",
          to: "/finance/invoices",
        },
        {
          id: "finance.invoices.drafts",
          type: "link",
          title: "Drafts",
          to: "/finance/invoices/drafts",
          badge: 3,
        },
      ],
    },
  ],
  status: [
    { id: "fin.period", label: "Period: 2026-06", tone: "info", icon: "Calendar" },
  ],
  commands: [
    {
      id: "finance.new-invoice",
      label: "New invoice",
      icon: "Plus",
      scope: "workspace",
      group: "Finance",
      keywords: ["create", "invoice", "bill"],
      shortcut: "mod+shift+i",
      priority: 10,
      run: () => {
        /* demo */
      },
    },
  ],
  lifecycle: {
    onActivate: () => {
      /* no-op demo */
    },
  },
};

export const suppliersWorkspace: WorkspaceDefinition = {
  id: "suppliers",
  name: "Suppliers",
  icon: "Truck",
  basePath: "/suppliers",
  permissions: ["suppliers.read"],
  navigation: [
    {
      id: "suppliers.list",
      type: "link",
      title: "All suppliers",
      icon: "Users",
      to: "/suppliers",
    },
    {
      id: "suppliers.po",
      type: "link",
      title: "Purchase orders",
      icon: "ClipboardList",
      to: "/suppliers/purchase-orders",
    },
  ],
  commands: [
    {
      id: "suppliers.new",
      label: "Add supplier",
      icon: "Plus",
      scope: "workspace",
      group: "Suppliers",
      run: () => {
        /* demo */
      },
    },
  ],
};

export const crmWorkspace: WorkspaceDefinition = {
  id: "crm",
  name: "CRM",
  icon: "HeartHandshake",
  basePath: "/crm",
  permissions: ["crm.read"],
  navigation: [
    {
      id: "crm.contacts",
      type: "link",
      title: "Contacts",
      icon: "Users",
      to: "/crm/contacts",
    },
    {
      id: "crm.deals",
      type: "link",
      title: "Deals",
      icon: "Briefcase",
      to: "/crm/deals",
    },
  ],
};

export const sampleWorkspaces = [
  financeWorkspace,
  suppliersWorkspace,
  crmWorkspace,
] as const;
