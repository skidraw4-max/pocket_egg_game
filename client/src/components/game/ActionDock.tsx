/**
 * ActionDock - 스크린샷 스타일 하단 액션 버튼 도크
 * 큰 원형 컬러 버튼: 먹이주기, 놀이, 목욕, 휴식, 상점 + 가챠 알 특수 액션
 */
import type { ReactNode } from 'react';
import { useGame } from '@/contexts/GameContext';
import type { ActiveMenu } from '@/pages/Home';
import { getSpecialActionDef, formatCooldownRemaining } from '@/lib/specialActions';

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
    labelColor: '#B91C1C',
  },
  {
    id: 'play' as const,
    label: '놀이',
    icon: '🎾',
    bgColor: '#60A5FA',
    shadowColor: 'rgba(59,130,246,0.4)',
    activeColor: '#3B82F6',
    labelColor: '#1D4ED8',
  },
  {
    id: 'clean' as const,
    label: '목욕',
    icon: '🛁',
    bgColor: '#34D399',
    shadowColor: 'rgba(16,185,129,0.4)',
    activeColor: '#10B981',
    labelColor: '#047857',
  },
  {
    id: 'sleep' as const,
    label: '휴식',
    icon: '🌙',
    bgColor: '#A78BFA',
    shadowColor: 'rgba(139,92,246,0.4)',
    activeColor: '#7C3AED',
    labelColor: '#6D28D9',
  },
  {
    id: 'decor' as const,
    label: '상점',
    icon: '🏪',
    bgColor: '#FBBF24',
    shadowColor: 'rgba(245,158,11,0.4)',
    activeColor: '#F59E0B',
    labelColor: '#B45309',
  },
];

export default function ActionDock({ activeMenu, setActiveMenu }: ActionDockProps) {
  const { sleep, clean, specialAction, specialActionCooldownMs, activeSpecialActionId } = useGame();

  const specialDef = getSpecialActionDef(activeSpecialActionId);
  const isSpecialOnCooldown = specialActionCooldownMs > 0;
  const cooldownLabel = formatCooldownRemaining(specialActionCooldownMs);

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
      case 'special':
        if (!isSpecialOnCooldown) specialAction();
        break;
    }
  };

  return (
    <div
      className="px-3 pt-3 pb-app-safe"
    >
      <div
        className="flex items-center justify-around rounded-3xl px-1 py-3"
        style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.3)',
        }}
      >
        {ACTIONS.map(({ id, label, icon, bgColor, shadowColor, activeColor, labelColor }) => {
          const isActive = activeMenu === id;
          return (
            <DockButton
              key={id}
              label={label}
              labelColor={labelColor}
              isActive={isActive}
              bgColor={bgColor}
              shadowColor={shadowColor}
              activeColor={activeColor}
              onClick={() => handleAction(id)}
            >
              <span className="text-2xl leading-none">{icon}</span>
            </DockButton>
          );
        })}

        {specialDef && (
          <DockButton
            label={isSpecialOnCooldown ? cooldownLabel : specialDef.name}
            labelColor={specialDef.themeColor}
            isActive={false}
            disabled={isSpecialOnCooldown}
            bgColor={specialDef.themeColor}
            shadowColor={specialDef.shadowColor}
            activeColor={specialDef.themeColor}
            onClick={() => handleAction('special')}
            iconOnly
          >
            <img
              src={specialDef.image}
              alt={specialDef.name}
              className="w-11 h-11 object-contain pointer-events-none"
              style={{ background: 'transparent' }}
              draggable={false}
            />
          </DockButton>
        )}
      </div>
    </div>
  );
}

interface DockButtonProps {
  label: string;
  labelColor: string;
  isActive: boolean;
  disabled?: boolean;
  bgColor: string;
  shadowColor: string;
  activeColor: string;
  onClick: () => void;
  children: ReactNode;
  /** PNG 아이콘 — 원형 그라데이션 대신 투명 배경 */
  iconOnly?: boolean;
}

function DockButton({
  label,
  labelColor,
  isActive,
  disabled = false,
  bgColor,
  shadowColor,
  activeColor,
  onClick,
  children,
  iconOnly = false,
}: DockButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 transition-all duration-200 active:scale-90 disabled:cursor-not-allowed"
      style={{ minWidth: 52, opacity: disabled ? 0.55 : 1 }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 overflow-hidden"
        style={
          iconOnly
            ? {
                background: 'transparent',
                boxShadow: isActive
                  ? `0 4px 14px ${shadowColor}`
                  : `0 4px 14px ${shadowColor}, inset 0 0 0 2px rgba(255,255,255,0.55)`,
                transform: isActive ? 'translateY(2px) scale(0.95)' : 'translateY(0) scale(1)',
              }
            : {
                background: isActive
                  ? `radial-gradient(circle at 35% 35%, ${activeColor}ee, ${activeColor})`
                  : `radial-gradient(circle at 35% 35%, ${bgColor}ee, ${bgColor})`,
                boxShadow: isActive
                  ? `0 4px 16px ${shadowColor}, inset 0 -3px 6px rgba(0,0,0,0.15)`
                  : `0 6px 20px ${shadowColor}, inset 0 -4px 8px rgba(0,0,0,0.12), inset 0 2px 4px rgba(255,255,255,0.4)`,
                transform: isActive ? 'translateY(2px) scale(0.95)' : 'translateY(0) scale(1)',
                border: '2px solid rgba(255,255,255,0.5)',
              }
        }
      >
        {children}
      </div>
      <span
        className="text-[10px] font-extrabold text-center leading-tight px-1.5 py-0.5 rounded-lg"
        style={{
          color: isActive ? '#FFFFFF' : labelColor,
          background: isActive ? activeColor : 'rgba(255,255,255,0.94)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
          border: isActive ? 'none' : `1px solid ${labelColor}33`,
          textShadow: isActive ? '0 1px 2px rgba(0,0,0,0.25)' : 'none',
          fontFamily: 'Nunito, sans-serif',
          maxWidth: 56,
        }}
      >
        {label}
      </span>
    </button>
  );
}
