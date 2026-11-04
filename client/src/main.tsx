import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";
import { lockPortraitOrientation } from "./lib/orientationLock";
import { initAppSafeArea } from "./lib/safeArea";
import { initGameSystemBars } from "./lib/systemBars";

// Capacitor WebView에서는 PWA Service Worker가 동적 import 청크 로딩을 방해할 수 있음
if (Capacitor.isNativePlatform()) {
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations().then(regs =>
      Promise.all(regs.map(reg => reg.unregister()))
    );
  }

  void StatusBar.setOverlaysWebView({ overlay: true });
  void StatusBar.setBackgroundColor({ color: "#7c3aed" });
  void StatusBar.setStyle({ style: Style.Dark });
} else {
  registerSW({ immediate: true });
}

// 보상형 광고 SDK는 사용자가 「광고 보기」를 탭할 때만 초기화 (가족 정책: 실행 직후 전면 UI 금지)

// 모바일/Android 세로 모드 고정
lockPortraitOrientation();

// Safe Area CSS 변수 (--safe-top / --app-safe-top)
initAppSafeArea();

// Android/iOS 하단 내비게이션 바 숨김 (게임 UI 겹침 방지)
initGameSystemBars();

createRoot(document.getElementById("root")!).render(<App />);
