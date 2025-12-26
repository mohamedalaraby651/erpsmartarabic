import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/registerServiceWorker";

// Register Service Worker
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
