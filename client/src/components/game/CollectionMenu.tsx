/**
 * CollectionMenu - 도감 화면
 * 스크린샷 스타일: 3열 카드 그리드, 등급별 탭 필터, 잠금/해금 카드
 */
import { useGame } from '@/contexts/GameContext';
import { getCharacterImage } from '@/lib/gameState';
import { useCharacterSkin } from '@/hooks/useCharacterSkin';
import { ALL_MONS, type MonEntry } from '@/lib/speciesRegistry';
import { useState } from 'react';
import CollectionCharacterModal from './CollectionCharacterModal';
import FullscreenOverlay from './FullscreenOverlay';

export type { MonEntry };

interface CollectionMenuProps {
  onClose: () => void;
}

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
  const { skin } = useCharacterSkin();
  const collected = state.collection;
  const collectedCount = ALL_MONS.filter(m => collected.includes(m.name)).length;
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedMon, setSelectedMon] = useState<MonEntry | null>(null);

  const filteredMons = activeTab === 'all'
    ? ALL_MONS
    : ALL_MONS.filter(m => m.stageLabel === activeTab);

  return (
    <FullscreenOverlay
      zClassName="z-50"
      style={{
        background: 'linear-gradient(180deg, #4C1D95 0%, #5B21B6 30%, #6D28D9 100%)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3">
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
        className="flex-1 overflow-y-auto px-3 pb-app-safe"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="grid grid-cols-3 gap-2.5">
          {filteredMons.map((mon, idx) => {
            const isCollected = collected.includes(mon.name);
            const imgUrl = getCharacterImage(mon.name, mon.stage as any, skin);
            return (
              <div
                key={mon.name}
                role={isCollected ? 'button' : undefined}
                tabIndex={isCollected ? 0 : undefined}
                onClick={isCollected ? () => setSelectedMon(mon) : undefined}
                onKeyDown={isCollected ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedMon(mon);
                  }
                } : undefined}
                className={`flex flex-col items-center rounded-2xl overflow-hidden transition-all ${
                  isCollected ? 'cursor-pointer active:scale-95' : 'cursor-default'
                }`}
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

      {selectedMon && (
        <CollectionCharacterModal
          mon={selectedMon}
          onClose={() => setSelectedMon(null)}
        />
      )}
    </FullscreenOverlay>
  );
}
