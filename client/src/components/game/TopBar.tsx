/**
 * TopBar - 스크린샷 스타일 헤더
 * 보라색 그라데이션 배경, 좌측 로고, 중앙 재화(코인+젬), 우측 설정 버튼
 * 2행: 도감·미션·전당·소셜·닉네임 버튼 (작은 pill 형태)
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
  onNicknameClick?: () => void;
  nickname?: string;
  unclaimedMissions?: number;
  syncing?: boolean;
}

export default function TopBar({
  coins,
  gems,
  onCollectionClick,
  onQuestClick,
  onHallClick,
  onSocialClick,
  onNicknameClick,
  nickname,
  unclaimedMissions = 0,
  syncing = false,
}: TopBarProps) {
  const { isMuted, toggleMute, volume, setVolume } = useSound();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  return (
    <div
      className="flex flex-col"
      style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
    >
      {/* ── 1행: 보라색 헤더 바 ── */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: 'linear-gradient(135deg, #6B21A8 0%, #7C3AED 50%, #8B5CF6 100%)',
          boxShadow: '0 2px 12px rgba(107,33,168,0.4)',
        }}
      >
        {/* 로고 */}
        <div className="flex items-center gap-1.5">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-logo-TSp2CWP5nehvpiMprvz3VZ.webp"
            alt="포켓 에그"
            className="w-9 h-9 rounded-full shadow-md border-2 border-white/40"
          />
          <div className="flex flex-col leading-none">
            <span className="text-white font-extrabold text-sm tracking-wide" style={{ fontFamily: 'Nunito, sans-serif', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              Pocket
            </span>
            <span className="text-yellow-300 font-extrabold text-sm tracking-wide" style={{ fontFamily: 'Nunito, sans-serif', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              Egg
            </span>
          </div>
        </div>

        {/* 재화 표시 */}
        <div className="flex items-center gap-2">
          {/* 코인 */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <span className="text-base leading-none">🪙</span>
            <span className="text-white font-bold text-xs" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {coins.toLocaleString()}
            </span>
            <span className="text-white/60 text-xs font-bold">+</span>
          </div>
          {/* 젬 */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <span className="text-base leading-none">💎</span>
            <span className="text-white font-bold text-xs" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {gems}
            </span>
            <span className="text-white/60 text-xs font-bold">+</span>
          </div>
        </div>

        {/* 설정(볼륨) 버튼 */}
        <div className="relative">
          <button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)' }}
            title={isMuted ? '음소거 해제' : '음소거'}
          >
            <span className="text-lg leading-none">{isMuted ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}</span>
          </button>

          {/* 볼륨 슬라이더 팝업 */}
          {showVolumeSlider && (
            <>
              {/* 외부 클릭 시 닫기 */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowVolumeSlider(false)}
              />
              <div
                className="absolute top-11 right-0 rounded-2xl px-4 py-4 shadow-2xl whitespace-nowrap z-50"
                style={{
                  background: 'rgba(255,255,255,0.97)',
                  border: '1.5px solid rgba(139,92,246,0.25)',
                  minWidth: 180,
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* 볼륨 레이블 */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-700">볼륨</span>
                  <span className="text-xs font-bold text-purple-700">
                    {isMuted ? '🔇 음소거' : `${Math.round(volume * 100)}%`}
                  </span>
                </div>

                {/* 슬라이더 */}
                <div className="flex items-center gap-2">
                  <span className="text-base">{isMuted ? '🔇' : volume === 0 ? '🔕' : volume > 0.5 ? '🔊' : '🔉'}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : Math.round(volume * 100)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) / 100;
                      setVolume(val);
                    }}
                    className="flex-1 h-3 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #7C3AED 0%, #7C3AED ${isMuted ? 0 : volume * 100}%, #E5E7EB ${isMuted ? 0 : volume * 100}%, #E5E7EB 100%)`,
                      accentColor: '#7C3AED',
                    }}
                  />
                </div>

                {/* 음소거 토글 버튼 */}
                <button
                  onClick={() => { toggleMute(); }}
                  className="mt-3 w-full text-xs font-bold rounded-xl px-3 py-2 transition-all active:scale-95"
                  style={{
                    background: isMuted ? '#7C3AED' : '#EDE9FE',
                    color: isMuted ? '#FFFFFF' : '#7C3AED',
                  }}
                >
                  {isMuted ? '🔊 음소거 해제' : '🔇 음소거'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 2행: 메뉴 버튼들 (보라색 배경 하단 연장) ── */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 flex-wrap"
        style={{
          background: 'linear-gradient(180deg, #7C3AED 0%, #6D28D9 100%)',
        }}
      >
        {onCollectionClick && (
          <button
            onClick={onCollectionClick}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white/90 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            📖 도감
          </button>
        )}
        {onQuestClick && (
          <button
            onClick={onQuestClick}
            className="relative flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white/90 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            📋 미션
            {unclaimedMissions > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {unclaimedMissions}
              </span>
            )}
          </button>
        )}
        {onHallClick && (
          <button
            onClick={onHallClick}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-yellow-300 transition-all active:scale-95 animate-pulse"
            style={{ background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.4)' }}
          >
            🏆 전당
          </button>
        )}
        {onSocialClick && (
          <button
            onClick={onSocialClick}
            className="relative flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white/90 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            🌐 소셜
            {syncing && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-sm" />
            )}
          </button>
        )}
        {onNicknameClick && (
          <button
            onClick={onNicknameClick}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white/90 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            title="닉네임 설정"
          >
            {nickname ? (
              <span className="max-w-[60px] truncate">👤 {nickname}</span>
            ) : (
              <span>👤 닉네임</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
