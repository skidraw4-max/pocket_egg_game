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

export type ActiveMenu = 'none' | 'feed' | 'play' | 'decor' | 'collection' | 'profile';

export default function Home() {
  const { state, pendingEvolution, isSleeping } = useGame();
  const { playBGM } = useSound();
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('none');

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

      {/* 수면 오버레이 */}
      {isSleeping && <SleepOverlay />}

      {/* 진화 연출 */}
      {pendingEvolution && <EvolutionScreen />}
    </div>
  );
}
