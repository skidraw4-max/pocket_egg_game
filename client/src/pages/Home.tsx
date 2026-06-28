/**
 * 메인 홈 화면 - 반려몬의 방
 * Cozy Nursery: 상단 상태 게이지, 중앙 반려몬, 하단 액션 버튼
 */
import { useGame } from '@/contexts/GameContext';
import { useSound } from '@/hooks/useSound';
import { useState, useEffect } from 'react';
import StatusBubbles from '@/components/game/StatusBubbles';
import PetDisplay from '@/components/game/PetDisplay';
import ActionDock from '@/components/game/ActionDock';
import FeedingMenu from '@/components/game/FeedingMenu';
import PlayMenu from '@/components/game/PlayMenu';
import ShopMenu from '@/components/game/ShopMenu';
import EvolutionScreen from '@/components/game/EvolutionScreen';
import SleepOverlay from '@/components/game/SleepOverlay';
import TopBar from '@/components/game/TopBar';
import CollectionMenu from '@/components/game/CollectionMenu';
import PetProfile from '@/components/game/PetProfile';
import RoomDecor from '@/components/game/RoomDecor';
import QuestPanel from '@/components/game/QuestPanel';
import HallOfFame from '@/components/game/HallOfFame';
import StatusAlert from '@/components/game/StatusAlert';
import DailyBonus from '@/components/game/DailyBonus';
import PWAPrompt from '@/components/game/PWAPrompt';
import SocialMenu from '@/components/game/SocialMenu';
import NicknameModal from '@/components/game/NicknameModal';
import { usePushNotification } from '@/hooks/usePushNotification';

export type ActiveMenu = 'none' | 'feed' | 'play' | 'decor' | 'collection' | 'profile' | 'quest' | 'hall' | 'social' | 'nickname';

/** wallpaper ID → 이미지 URL 매핑 */
const WALLPAPER_URLS: Record<string, string> = {
  default:           'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-room-bg-RWqGiSQbzfCq5GS93bZek3.webp',
  wallpaper_forest:  'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/EDyFLiIKoVTNidnh.png',
  wallpaper_ocean:   'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/fpjUTdQSftHkbLXj.png',
  wallpaper_cloud:   'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/jQMljEkJnwaQEIjS.png',
  wallpaper_candy:   'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/vuxdWHKrUrCnFAUo.png',
};

export default function Home() {
  const { state, pendingEvolution, isSleeping, attendanceResult, clearAttendanceResult, syncing } = useGame();
  const { playBGM } = useSound();
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('none');
  const { checkAndNotify, scheduleBackgroundCheck } = usePushNotification();

  // 반려몬 상태 변경 시 알림 체크
  useEffect(() => {
    checkAndNotify(state);
  }, [state.status.hunger, state.status.fatigue, state.status.clean, checkAndNotify]);

  // 백그라운드 복귀 시 알림 체크 등록
  useEffect(() => {
    const cleanup = scheduleBackgroundCheck(() => state);
    return cleanup;
  }, [scheduleBackgroundCheck, state]);

  // 컴포넌트 마운트 시 BGM 시작 (단 1회만)
  useEffect(() => {
    playBGM('main-room');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col" onClick={() => {
      // 사용자 인터랙션 후 AudioContext resume (자동 재생 정송 우회)
      // BGM이 이미 재생 중이면 싱글턴에서 중복 방지함
      playBGM('main-room');
    }}>
      {/* 배경 이미지 — 구매한 wallpaper ID에 따라 동적 변경 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: `url(${WALLPAPER_URLS[state.room?.wallpaper ?? 'default'] ?? WALLPAPER_URLS['default']})`,
        }}
      />
      {/* 반투명 오버레이 */}
      <div className="absolute inset-0 bg-[oklch(0.98_0.015_80)]/20" />

      {/* 가구 렌더링 레이어 */}
      <RoomDecor furniture={state.room?.furniture ?? []} />

      {/* 콘텐츠 레이어 */}
      <div className="relative z-10 flex flex-col h-full">
        {/* 상단: 로고 + 재화 + 사운드 제어 */}
        <TopBar
          coins={state.coins}
          gems={state.gems}
          onCollectionClick={() => setActiveMenu('collection')}
          onQuestClick={() => setActiveMenu('quest')}
          onHallClick={(state.pet.stage === 'adult' && state.pet.species === '레전드몬') || state.pet.stage === 'mythic' ? () => setActiveMenu('hall') : undefined}
          onSocialClick={() => setActiveMenu('social')}
          onNicknameClick={() => setActiveMenu('nickname')}
          nickname={state.nickname}
          syncing={syncing}
          unclaimedMissions={
            (state.missions?.missions ?? []).filter(m => m.completed && !m.claimed).length
          }
        />

        {/* 상태 게이지 */}
        <StatusBubbles status={state.status} />

        {/* 이름 탭 — 상태바 바로 아래 중앙 배치 */}
        <div className="flex justify-center pb-1">
          <button
            onClick={() => setActiveMenu('profile')}
            className="flex items-center gap-2 min-h-[36px] px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.10), inset 0 1px 2px rgba(255,255,255,0.8)',
              border: '1.5px solid rgba(255,255,255,0.7)',
            }}
            title="프로필 보기"
          >
            <span className="text-sm">👤</span>
            <span className="text-sm font-extrabold" style={{ fontFamily: 'Nunito, sans-serif', color: '#5B21B6' }}>
              {state.pet.name}
            </span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#EDE9FE', color: '#7C3AED' }}>Lv.{state.pet.level}</span>
            <span className="text-xs" style={{ color: '#EC4899' }}>♥ {Math.floor(state.pet.intimacy)}</span>
          </button>
        </div>

        {/* 중앙: 반려몬 */}
        <div className="flex-1 flex items-center justify-center">
          <PetDisplay
            pet={state.pet}
            isSleeping={isSleeping}
            onLongPress={() => setActiveMenu('profile')}
          />
        </div>

        {/* 하단: 액션 버튼 도크 */}
        <ActionDock activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      </div>

      {/* 오버레이 메뉴 */}
      {activeMenu === 'feed' && (
        <FeedingMenu onClose={() => setActiveMenu('none')} />
      )}
      {activeMenu === 'play' && (
        <PlayMenu onClose={() => setActiveMenu('none')} />
      )}
      {activeMenu === 'decor' && (
        <ShopMenu onClose={() => setActiveMenu('none')} />
      )}
      {activeMenu === 'collection' && (
        <CollectionMenu onClose={() => setActiveMenu('none')} />
      )}
      {activeMenu === 'profile' && (
        <PetProfile onClose={() => setActiveMenu('none')} />
      )}
      {activeMenu === 'quest' && (
        <QuestPanel onClose={() => setActiveMenu('none')} />
      )}
      {activeMenu === 'hall' && (
        <HallOfFame onClose={() => setActiveMenu('none')} />
      )}
      {activeMenu === 'social' && (
        <SocialMenu onClose={() => setActiveMenu('none')} />
      )}
      {activeMenu === 'nickname' && (
        <NicknameModal onClose={() => setActiveMenu('none')} />
      )}

      {/* 상태 임계치 알림 */}
      <StatusAlert />

      {/* 수면 오버레이 */}
      {isSleeping && <SleepOverlay />}

      {/* 진화 연출 */}
      {pendingEvolution && <EvolutionScreen />}

      {/* 출석 보상 팝업 */}
      {attendanceResult?.isNewDay && (
        <DailyBonus result={attendanceResult} onClose={clearAttendanceResult} />
      )}

      {/* PWA 설치 프롬프트 및 알림 권한 요청 */}
      <PWAPrompt />
    </div>
  );
}
