/**
 * TopBar - 로고 + 재화 표시 + 도감 버튼 + 사운드 제어
 * Cozy Nursery: 부드러운 반투명 배경, 둥근 pill 형태
 */
import { useSound } from '@/hooks/useSound';
import { useState } from 'react';

interface TopBarProps {
  coins: number;
  gems: number;
  onCollectionClick?: () => void;
  onQuestClick?: () => void;
  onHallClick?: () => void;
  onSocialClick?: () => void;
  unclaimedMissions?: number;
  syncing?: boolean;
}

export default function TopBar({ coins, gems, onCollectionClick, onQuestClick, onHallClick, onSocialClick, unclaimedMissions = 0, syncing = false }: TopBarProps) {
  const { isMuted, toggleMute, volume, setVolume } = useSound();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  return (
    <div className="flex items-center justify-between px-4 pb-1" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      {/* 로고 + 도감 */}
      <div className="flex items-center gap-2">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-logo-TSp2CWP5nehvpiMprvz3VZ.webp"
          alt="포켓 에그"
          className="w-9 h-9 rounded-full shadow-md"
        />
        <span className="font-bold text-warm-brown text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>
          포켓 에그
        </span>
        {onCollectionClick && (
          <button
            onClick={onCollectionClick}
            className="ml-2 bg-white/70 backdrop-blur-sm rounded-full px-3 py-2 shadow-sm text-xs font-semibold text-sub-brown min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            📖 도감
          </button>
        )}
        {onQuestClick && (
          <button
            onClick={onQuestClick}
            className="relative ml-1 bg-white/70 backdrop-blur-sm rounded-full px-3 py-2 shadow-sm text-xs font-semibold text-sub-brown min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            📋 미션
            {unclaimedMissions > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-peach text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unclaimedMissions}
              </span>
            )}
          </button>
        )}
        {onHallClick && (
          <button
            onClick={onHallClick}
            className="ml-1 bg-gradient-to-r from-yellow-300/80 to-orange-300/80 backdrop-blur-sm rounded-full px-3 py-2 shadow-sm text-xs font-semibold text-warm-brown min-h-[44px] min-w-[44px] flex items-center justify-center animate-pulse"
          >
            🏆 전당
          </button>
        )}
        {onSocialClick && (
          <button
            onClick={onSocialClick}
            className="relative ml-1 bg-white/70 backdrop-blur-sm rounded-full px-3 py-2 shadow-sm text-xs font-semibold text-sub-brown min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            🌐 소셜
            {syncing && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
            )}
          </button>
        )}
      </div>

      {/* 사운드 제어 + 재화 */}
      <div className="flex items-center gap-3">
        {/* 볼륨 제어 */}
        <div className="relative flex items-center gap-1">
          <button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            className="bg-white/70 backdrop-blur-sm rounded-full p-2 shadow-sm hover:bg-white/90 transition-all"
            title={isMuted ? '음소거 해제' : '음소거'}
          >
            <span className="text-lg">{isMuted ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}</span>
          </button>

          {/* 볼륨 슬라이더 (토글) */}
          {showVolumeSlider && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md rounded-2xl px-3 py-3 shadow-lg whitespace-nowrap z-50">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : Math.round(volume * 100)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) / 100;
                    setVolume(val);
                  }}
                  className="w-24 h-2 bg-peach/30 rounded-full appearance-none cursor-pointer accent-peach"
                  style={{
                    background: `linear-gradient(to right, oklch(0.85 0.15 30) 0%, oklch(0.85 0.15 30) ${isMuted ? 0 : volume * 100}%, oklch(0.95 0.05 30) ${isMuted ? 0 : volume * 100}%, oklch(0.95 0.05 30) 100%)`
                  }}
                />
                <span className="text-xs font-semibold text-warm-brown min-w-6 text-right">
                  {isMuted ? '0' : Math.round(volume * 100)}
                </span>
              </div>
              <button
                onClick={toggleMute}
                className="mt-2 w-full text-xs font-semibold text-warm-brown bg-peach/20 hover:bg-peach/30 rounded-lg px-2 py-1 transition-colors"
              >
                {isMuted ? '음소거 해제' : '음소거'}
              </button>
            </div>
          )}
        </div>
        {/* 재화 표시 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/70 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
            <span className="text-base">🪙</span>
            <span className="text-sm font-bold text-warm-brown" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {coins.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-white/70 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
            <span className="text-base">💎</span>
            <span className="text-sm font-bold text-warm-brown" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {gems}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
