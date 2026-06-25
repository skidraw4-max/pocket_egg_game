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

  // 컴포넌트 마운트 시 BGM 시작
  useEffect(() => {
    playBGM('main-room');
  }, [playBGM]);

  // 메뉴 닫힐 때 BGM 계속 재생
  useEffect(() => {
    if (activeMenu === 'none') {
      playBGM('main-room');
    }
  }, [activeMenu, playBGM]);

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col" onClick={() => {
      // 사용자 인터랙션 후 BGM 재생 (자동 재생 정책 우회)
      playBGM('main-room');
    }}>
      {/* 배경 이미지 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-room-bg-RWqGiSQbzfCq5GS93bZek3.webp)`,
        }}
      />
      {/* 반투명 오버레이 */}
      <div className="absolute inset-0 bg-[oklch(0.98_0.015_80)]/20" />

      {/* 가구 렌더링 레이어 */}
      <RoomDecor furniture={state.room.furniture} />

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
            state.missions.missions.filter(m => m.completed && !m.claimed).length
          }
        />

        {/* 상태 게이지 */}
        <StatusBubbles status={state.status} />

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
