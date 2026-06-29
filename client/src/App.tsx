import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GameProvider } from "./contexts/GameContext";
import Home from "./pages/Home";
import TitleScreen from "./pages/TitleScreen";
import EggSelectScreen from "./pages/EggSelectScreen";
import { useState } from "react";
import { useGame } from "./contexts/GameContext";
import type { EggColorId } from "./lib/eggTypes";

type AppScreen = 'title' | 'egg_select' | 'game';

/** 타이틀 → 알 선택 → 게임 화면 전환을 관리하는 래퍼 */
function GameShell() {
  const { state, setEggColor, resetPet } = useGame();

  // 세션 단위로 타이틀 표시 여부 결정
  const [screen, setScreen] = useState<AppScreen>(() => {
    try {
      if (sessionStorage.getItem('pocket_egg_session_started') === 'true') {
        return 'game';
      }
    } catch { /* ignore */ }
    return 'title';
  });

  /** 타이틀 → 알 선택 (신규) 또는 게임 (기존 유저) */
  const handleTitleStart = () => {
    // 이미 알을 선택한 기존 유저는 바로 게임으로
    if (state.eggColor !== null || state.gachaEgg !== null) {
      try { sessionStorage.setItem('pocket_egg_session_started', 'true'); } catch { /* ignore */ }
      setScreen('game');
    } else {
      setScreen('egg_select');
    }
  };

  /** 새로 키우기 → 알 선택 스핀으로 이동 */
  const handleResetPet = () => {
    resetPet(() => {
      try { sessionStorage.removeItem('pocket_egg_session_started'); } catch { /* ignore */ }
      setScreen('egg_select');
    });
  };

  /** 알 선택 완료 → 게임 시작 */
  const handleEggSelect = (eggColor: EggColorId) => {
    setEggColor(eggColor);
    try { sessionStorage.setItem('pocket_egg_session_started', 'true'); } catch { /* ignore */ }
    setScreen('game');
  };

  return (
    <div className="relative w-full h-full">
      {/* 게임 메인 화면 (항상 마운트) */}
      <Home onResetPet={handleResetPet} />

      {/* 알 선택 화면 */}
      {screen === 'egg_select' && (
        <EggSelectScreen onSelect={handleEggSelect} />
      )}

      {/* 타이틀 화면 */}
      {screen === 'title' && (
        <div className="absolute inset-0 z-[200]">
          <TitleScreen onStart={handleTitleStart} />
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
