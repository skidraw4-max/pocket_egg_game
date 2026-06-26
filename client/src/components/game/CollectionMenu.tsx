/**
 * CollectionMenu - 도감 화면
 * 스크린샷 스타일: 3열 카드 그리드, 등급별 탭 필터, 잠금/해금 카드
 */
import { useGame } from '@/contexts/GameContext';
import { getCharacterImage } from '@/lib/gameState';
import { useState } from 'react';

interface CollectionMenuProps {
  onClose: () => void;
}

interface MonEntry {
  name: string;
  stage: 'baby' | 'child' | 'teen' | 'adult' | 'mythic';
  stageLabel: string;
  icon: string;
  description: string;
  traitHint: string;
  gradeColor: string;
  gradeBg: string;
  gradeBorder: string;
}

const ALL_MONS: MonEntry[] = [
  {
    name: '기본몬',
    stage: 'baby',
    stageLabel: '노멀',
    icon: '🥚',
    description: '알에서 갓 태어난 순수한 반려몬',
    traitHint: '모든 성향의 시작점',
    gradeColor: '#9CA3AF',
    gradeBg: '#F9FAFB',
    gradeBorder: '#E5E7EB',
  },
  {
    name: '파워몬',
    stage: 'child',
    stageLabel: '언커먼',
    icon: '💪',
    description: '힘이 넘치는 활발한 반려몬',
    traitHint: '힘 성향 우세 시 진화',
    gradeColor: '#22C55E',
    gradeBg: '#F0FDF4',
    gradeBorder: '#BBF7D0',
  },
  {
    name: '위즈몬',
    stage: 'child',
    stageLabel: '언커먼',
    icon: '🧠',
    description: '호기심 가득한 똑똑한 반려몬',
    traitHint: '지능 성향 우세 시 진화',
    gradeColor: '#22C55E',
    gradeBg: '#F0FDF4',
    gradeBorder: '#BBF7D0',
  },
  {
    name: '러블리몬',
    stage: 'child',
    stageLabel: '언커먼',
    icon: '💖',
    description: '사랑스러운 매력의 반려몬',
    traitHint: '매력 성향 우세 시 진화',
    gradeColor: '#22C55E',
    gradeBg: '#F0FDF4',
    gradeBorder: '#BBF7D0',
  },
  {
    name: '그린몬',
    stage: 'child',
    stageLabel: '언커먼',
    icon: '🌿',
    description: '자연을 사랑하는 건강한 반려몬',
    traitHint: '활력 성향 우세 시 진화',
    gradeColor: '#22C55E',
    gradeBg: '#F0FDF4',
    gradeBorder: '#BBF7D0',
  },
  {
    name: '드래곤몬',
    stage: 'teen',
    stageLabel: '레어',
    icon: '🐉',
    description: '강력한 힘을 가진 용 반려몬',
    traitHint: '파워몬 → 힘 성향 심화',
    gradeColor: '#3B82F6',
    gradeBg: '#EFF6FF',
    gradeBorder: '#BFDBFE',
  },
  {
    name: '매직몬',
    stage: 'teen',
    stageLabel: '레어',
    icon: '🔮',
    description: '마법을 부리는 신비한 반려몬',
    traitHint: '위즈몬 → 지능 성향 심화',
    gradeColor: '#3B82F6',
    gradeBg: '#EFF6FF',
    gradeBorder: '#BFDBFE',
  },
  {
    name: '엔젤몬',
    stage: 'teen',
    stageLabel: '레어',
    icon: '👼',
    description: '천사처럼 아름다운 반려몬',
    traitHint: '러블리몬 → 매력 성향 심화',
    gradeColor: '#3B82F6',
    gradeBg: '#EFF6FF',
    gradeBorder: '#BFDBFE',
  },
  {
    name: '포레스몬',
    stage: 'teen',
    stageLabel: '레어',
    icon: '🌳',
    description: '숲의 수호자 반려몬',
    traitHint: '그린몬 → 활력 성향 심화',
    gradeColor: '#3B82F6',
    gradeBg: '#EFF6FF',
    gradeBorder: '#BFDBFE',
  },
  {
    name: '레전드몬',
    stage: 'adult',
    stageLabel: '에픽',
    icon: '👑',
    description: '모든 속성을 초월한 전설의 반려몬',
    traitHint: 'Lv.30 최종 진화',
    gradeColor: '#A855F7',
    gradeBg: '#FAF5FF',
    gradeBorder: '#E9D5FF',
  },
  {
    name: '인페르노몬',
    stage: 'mythic',
    stageLabel: '레전드',
    icon: '🔥',
    description: '화염을 지배하는 궁극의 드래곤 반려몬',
    traitHint: '레전드몬 Lv.50 + 힘 성향 우세',
    gradeColor: '#EAB308',
    gradeBg: '#FEFCE8',
    gradeBorder: '#FDE68A',
  },
  {
    name: '오라클몬',
    stage: 'mythic',
    stageLabel: '레전드',
    icon: '🔮',
    description: '우주의 진리를 꿰뚫는 전지전능한 반려몬',
    traitHint: '레전드몬 Lv.50 + 지능 성향 우세',
    gradeColor: '#EAB308',
    gradeBg: '#FEFCE8',
    gradeBorder: '#FDE68A',
  },
  {
    name: '세라피몬',
    stage: 'mythic',
    stageLabel: '레전드',
    icon: '✨',
    description: '신성한 빛을 발하는 최고의 천사 반려몬',
    traitHint: '레전드몬 Lv.50 + 매력 성향 우세',
    gradeColor: '#EAB308',
    gradeBg: '#FEFCE8',
    gradeBorder: '#FDE68A',
  },
  {
    name: '가이아몬',
    stage: 'mythic',
    stageLabel: '레전드',
    icon: '🌍',
    description: '대지의 생명력을 담은 자연의 신 반려몬',
    traitHint: '레전드몬 Lv.50 + 활력 성향 우세',
    gradeColor: '#EAB308',
    gradeBg: '#FEFCE8',
    gradeBorder: '#FDE68A',
  },
];

const GRADE_TABS = [
  { label: '전체', value: 'all', dot: '#9CA3AF' },
  { label: '노멀', value: '노멀', dot: '#9CA3AF' },
  { label: '언커먼', value: '언커먼', dot: '#22C55E' },
  { label: '레어', value: '레어', dot: '#3B82F6' },
  { label: '에픽', value: '에픽', dot: '#A855F7' },
  { label: '레전드', value: '레전드', dot: '#EAB308' },
];

export default function CollectionMenu({ onClose }: CollectionMenuProps) {
  const { state } = useGame();
  const collected = state.collection;
  const collectedCount = ALL_MONS.filter(m => collected.includes(m.name)).length;
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredMons = activeTab === 'all'
    ? ALL_MONS
    : ALL_MONS.filter(m => m.stageLabel === activeTab);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #4C1D95 0%, #5B21B6 30%, #6D28D9 100%)',
      }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
        >
          <span className="text-white text-lg">←</span>
        </button>

        <div className="flex flex-col items-center">
          <h2
            className="text-xl font-extrabold text-white"
            style={{ fontFamily: 'Nunito, sans-serif', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
          >
            🐾 반려몬 도감
          </h2>
          <p className="text-white/70 text-xs mt-0.5">다양한 반려몬을 만나보세요!</p>
        </div>

        <div
          className="flex items-center gap-1 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
        >
          <span className="text-white text-xs font-bold">📖</span>
          <span className="text-white text-xs font-bold">{collectedCount}/{ALL_MONS.length}</span>
        </div>
      </div>

      {/* 등급 탭 */}
      <div className="flex items-center gap-1.5 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {GRADE_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 flex-shrink-0"
            style={{
              background: activeTab === tab.value ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
              color: activeTab === tab.value ? '#5B21B6' : 'rgba(255,255,255,0.85)',
              border: activeTab === tab.value ? '2px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.25)',
              boxShadow: activeTab === tab.value ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            {tab.value !== 'all' && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: tab.dot }}
              />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 카드 그리드 */}
      <div
        className="flex-1 overflow-y-auto px-3 pb-4"
        style={{ scrollbarWidth: 'none', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-3 gap-2.5">
          {filteredMons.map((mon, idx) => {
            const isCollected = collected.includes(mon.name);
            const imgUrl = getCharacterImage(mon.name, mon.stage as any);
            return (
              <div
                key={mon.name}
                className="flex flex-col items-center rounded-2xl overflow-hidden transition-all active:scale-95"
                style={{
                  background: isCollected ? mon.gradeBg : '#1E1B4B',
                  border: `2px solid ${isCollected ? mon.gradeBorder : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: isCollected
                    ? `0 4px 16px ${mon.gradeColor}30`
                    : '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {/* 번호 + 등급 배지 */}
                <div className="w-full flex items-center justify-between px-2 pt-2 pb-1">
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: isCollected ? '#6B7280' : 'rgba(255,255,255,0.4)' }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: isCollected ? mon.gradeColor : 'rgba(255,255,255,0.2)' }}
                  />
                </div>

                {/* 이미지 영역 */}
                <div className="w-full flex items-center justify-center py-2 px-2" style={{ minHeight: 80 }}>
                  {isCollected ? (
                    <img
                      src={imgUrl}
                      alt={mon.name}
                      className="w-16 h-16 object-contain drop-shadow-md"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <span className="text-2xl opacity-40">🔒</span>
                    </div>
                  )}
                </div>

                {/* 이름 + 등급 */}
                <div
                  className="w-full px-2 pb-2.5 flex flex-col items-center gap-0.5"
                  style={{ borderTop: `1px solid ${isCollected ? mon.gradeBorder : 'rgba(255,255,255,0.08)'}` }}
                >
                  <span
                    className="text-xs font-bold mt-1.5 truncate w-full text-center"
                    style={{ color: isCollected ? '#1F2937' : 'rgba(255,255,255,0.3)' }}
                  >
                    {isCollected ? mon.name : '???'}
                  </span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: isCollected ? `${mon.gradeColor}20` : 'rgba(255,255,255,0.08)',
                      color: isCollected ? mon.gradeColor : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {mon.stageLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pop-in {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in {
          animation: pop-in 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
      `}</style>
    </div>
  );
}
