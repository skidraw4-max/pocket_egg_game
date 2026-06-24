import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GameProvider } from "./contexts/GameContext";
import Home from "./pages/Home";
import TitleScreen from "./pages/TitleScreen";
import { useState } from "react";

/** 타이틀 → 게임 화면 전환을 관리하는 래퍼 */
function GameShell() {
  // 최초 실행 여부: localStorage에 'pocket_egg_started' 키가 없으면 타이틀 표시
  const [gameStarted, setGameStarted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pocket_egg_started') === 'true';
    } catch {
      return false;
    }
  });

  const handleStart = () => {
    try {
      localStorage.setItem('pocket_egg_started', 'true');
    } catch { /* ignore */ }
    setGameStarted(true);
  };

  return (
    <div className="relative w-full h-full">
      {/* 게임 메인 화면 (항상 마운트, 타이틀 뒤에 대기) */}
      <Home />

      {/* 타이틀 화면 (최초 실행 시에만 표시) */}
      {!gameStarted && (
        <div className="absolute inset-0 z-[200]">
          <TitleScreen onStart={handleStart} />
        </div>
      )}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={GameShell} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <GameProvider>
            <Toaster />
            <Router />
          </GameProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
