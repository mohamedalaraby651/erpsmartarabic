
import base from "../../vite.config";
import { visualizer } from "rollup-plugin-visualizer";
const cfg: any = typeof base === "function" ? (base as any)({ mode: "production", command: "build" }) : base;
cfg.plugins = [...(cfg.plugins ?? []), visualizer({ filename: "/dev-server/scripts/audits/output/.bundle-stats.json", template: "raw-data", gzipSize: true, brotliSize: false, sourcemap: false })];
export default cfg;
