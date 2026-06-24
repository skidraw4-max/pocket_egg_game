/**
 * ActionDock - 하단 액션 버튼 도크
 * Cozy Nursery: 쿠션 버튼 스타일, 부드러운 아이콘
 */
import { useGame } from '@/contexts/GameContext';
import type { ActiveMenu } from '@/pages/Home';

interface ActionDockProps {
  activeMenu: ActiveMenu;
  setActiveMenu: (menu: ActiveMenu) => void;
}

const ACTIONS = [
  { id: 'feed' as const, label: '먹이', icon: '🍖', color: 'from-peach-light to-peach' },
  { id: 'play' as const, label: '놀이', icon: '🎾', color: 'from-mint-light to-mint' },
  { id: 'clean' as const, label: '청소', icon: '🫧', color: 'from-[oklch(0.90_0.06_220)] to-[oklch(0.75_0.12_220)]' },
  { id: 'sleep' as const, label: '수면', icon: '🌙', color: 'from-lavender-light to-lavender' },
  { id: 'decor' as const, label: '꾸미기', icon: '🏠', color: 'from-[oklch(0.93_0.06_50)] to-peach' },
];

export default function ActionDock({ activeMenu, setActiveMenu }: ActionDockProps) {
  const { clean, sleep } = useGame();

  const handleAction = (id: string) => {
    switch (id) {
      case 'feed':
        setActiveMenu(activeMenu === 'feed' ? 'none' : 'feed');
        break;
      case 'play':
        setActiveMenu(activeMenu === 'play' ? 'none' : 'play');
        break;
      case 'clean':
        clean();
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
    <div className="px-3 pt-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-around bg-white/80 backdrop-blur-md rounded-3xl px-2 py-3 shadow-lg">
        {ACTIONS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => handleAction(id)}
            className={`
              flex flex-col items-center gap-1 px-3 py-2 rounded-2xl
              cushion-btn transition-all duration-200
              ${activeMenu === id ? 'bg-peach/20 scale-95' : 'bg-white/60 hover:bg-white/90'}
            `}
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-[10px] font-semibold text-warm-brown">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
