/**
 * ActionDock - 스크린샷 스타일 하단 액션 버튼 도크
 * 큰 원형 컬러 버튼 4개: 먹이주기(분홍), 놀이(파랑), 휴식(보라), 상점(노랑)
 * 각 버튼에 아이콘 이미지 + 텍스트 레이블
 */
import { useGame } from '@/contexts/GameContext';
import type { ActiveMenu } from '@/pages/Home';

interface ActionDockProps {
  activeMenu: ActiveMenu;
  setActiveMenu: (menu: ActiveMenu) => void;
}

const ACTIONS = [
  {
    id: 'feed' as const,
    label: '먹이주기',
    icon: '🍼',
    bgColor: '#F87171',
    shadowColor: 'rgba(239,68,68,0.4)',
    activeColor: '#EF4444',
  },
  {
    id: 'play' as const,
    label: '놀이',
    icon: '🎾',
    bgColor: '#60A5FA',
    shadowColor: 'rgba(59,130,246,0.4)',
    activeColor: '#3B82F6',
  },
  {
    id: 'sleep' as const,
    label: '휴식',
    icon: '🌙',
    bgColor: '#A78BFA',
    shadowColor: 'rgba(139,92,246,0.4)',
    activeColor: '#7C3AED',
  },
  {
    id: 'decor' as const,
    label: '상점',
    icon: '🏪',
    bgColor: '#FBBF24',
    shadowColor: 'rgba(245,158,11,0.4)',
    activeColor: '#F59E0B',
  },
];

export default function ActionDock({ activeMenu, setActiveMenu }: ActionDockProps) {
  const { sleep } = useGame();

  const handleAction = (id: string) => {
    switch (id) {
      case 'feed':
        setActiveMenu(activeMenu === 'feed' ? 'none' : 'feed');
        break;
      case 'play':
        setActiveMenu(activeMenu === 'play' ? 'none' : 'play');
        break;
      case 'sleep':
        sleep();
        break;
      case 'decor':
        setActiveMenu(activeMenu === 'decor' ? 'none' : 'decor');
        break;
    }
  };

  return (
    <div
      className="px-4 pt-3"
      style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
    >
      {/* 반투명 배경 패널 */}
      <div
        className="flex items-center justify-around rounded-3xl px-2 py-3"
        style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.3)',
        }}
      >
        {ACTIONS.map(({ id, label, icon, bgColor, shadowColor, activeColor }) => {
          const isActive = activeMenu === id;
          return (
            <button
              key={id}
              onClick={() => handleAction(id)}
              className="flex flex-col items-center gap-1.5 transition-all duration-200 active:scale-90"
              style={{ minWidth: 64 }}
            >
              {/* 원형 아이콘 버튼 */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: isActive
                    ? `radial-gradient(circle at 35% 35%, ${activeColor}ee, ${activeColor})`
                    : `radial-gradient(circle at 35% 35%, ${bgColor}ee, ${bgColor})`,
                  boxShadow: isActive
                    ? `0 4px 16px ${shadowColor}, inset 0 -3px 6px rgba(0,0,0,0.15)`
                    : `0 6px 20px ${shadowColor}, inset 0 -4px 8px rgba(0,0,0,0.12), inset 0 2px 4px rgba(255,255,255,0.4)`,
                  transform: isActive ? 'translateY(2px) scale(0.95)' : 'translateY(0) scale(1)',
                  border: '2px solid rgba(255,255,255,0.5)',
                }}
              >
                <span className="text-3xl leading-none">{icon}</span>
              </div>
              {/* 레이블 */}
              <span
                className="text-xs font-bold"
                style={{
                  color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.9)',
                  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
