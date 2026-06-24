/**
 * StatusAlert - 반려몬 상태 임계치 인앱 알림
 * 배고픔 < 25, 피로 > 75, 청결 < 25 시 화면 상단에 토스트 표시
 */
import { useGame } from '@/contexts/GameContext';
import { useEffect, useRef, useState } from 'react';

interface AlertItem {
  id: string;
  message: string;
  icon: string;
  color: string;
}

export default function StatusAlert() {
  const { state, isSleeping } = useGame();
  const { status } = state;
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const prevRef = useRef({ hunger: 100, fatigue: 0, clean: 100 });

  useEffect(() => {
    if (isSleeping) return;

    const prev = prevRef.current;
    const newAlerts: AlertItem[] = [];

    // 배고픔 임계치 (100→25 하향 돌파)
    if (status.hunger < 25 && prev.hunger >= 25) {
      newAlerts.push({
        id: `hunger-${Date.now()}`,
        message: `${state.pet.name}이(가) 배고파해요!`,
        icon: '🍖',
        color: 'from-orange-400 to-peach',
      });
    }

    // 피로 임계치 (0→75 상향 돌파)
    if (status.fatigue > 75 && prev.fatigue <= 75) {
      newAlerts.push({
        id: `fatigue-${Date.now()}`,
        message: `${state.pet.name}이(가) 너무 피곤해요!`,
        icon: '💤',
        color: 'from-lavender to-[oklch(0.70_0.15_280)]',
      });
    }

    // 청결 임계치 (100→25 하향 돌파)
    if (status.clean < 25 && prev.clean >= 25) {
      newAlerts.push({
        id: `clean-${Date.now()}`,
        message: `${state.pet.name}이(가) 씻고 싶어해요!`,
        icon: '🛁',
        color: 'from-mint to-[oklch(0.65_0.15_200)]',
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts]);
      // 3초 후 자동 제거
      newAlerts.forEach(alert => {
        setTimeout(() => {
          setAlerts(prev => prev.filter(a => a.id !== alert.id));
        }, 3000);
      });
    }

    prevRef.current = {
      hunger: status.hunger,
      fatigue: status.fatigue,
      clean: status.clean,
    };
  }, [status.hunger, status.fatigue, status.clean, isSleeping, state.pet.name]);

  if (alerts.length === 0) return null;

  return (
    <div className="absolute top-20 left-0 right-0 z-[60] flex flex-col items-center gap-2 pointer-events-none px-4">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`flex items-center gap-2 bg-gradient-to-r ${alert.color} text-white rounded-2xl px-4 py-2.5 shadow-lg`}
          style={{ animation: 'alert-in 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards' }}
        >
          <span className="text-xl">{alert.icon}</span>
          <span className="text-sm font-bold">{alert.message}</span>
        </div>
      ))}

      <style>{`
        @keyframes alert-in {
          from { opacity: 0; transform: translateY(-12px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0)     scale(1); }
        }
      `}</style>
    </div>
  );
}
