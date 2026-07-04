/**
 * Reserved for Wave N: Intelligence layer. Only slot name constants live
 * here in Wave 1.
 */
export const INTELLIGENCE_SLOTS = {
  panelRight: "intelligence.panel.right",
  commandScope: "intelligence.command.scope",
  topbarTrigger: "intelligence.topbar.trigger",
  workspaceFooter: "intelligence.workspace.footer",
} as const;
export type IntelligenceSlot = (typeof INTELLIGENCE_SLOTS)[keyof typeof INTELLIGENCE_SLOTS];
