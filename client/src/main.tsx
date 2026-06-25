import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initAdMob } from "./lib/admob";

// AdMob SDK 초기화 (앱 시작 시 1회 실행)
initAdMob();

createRoot(document.getElementById("root")!).render(<App />);
