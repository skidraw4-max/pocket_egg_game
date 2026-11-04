/**

 * 메인 홈 화면 - 반려몬의 방

 * Cozy Nursery: 상단 상태 게이지, 중앙 반려몬, 하단 액션 버튼

 */

import { useGame } from '@/contexts/GameContext';

import { useSound, isMinigameBgmActive } from '@/hooks/useSound';

import { useState, useEffect } from 'react';

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

import RoomStage from '@/components/game/RoomStage';
import RoomHeaderOverlay from '@/components/game/RoomHeaderOverlay';
import { getWallpaperUrl } from '@/lib/roomAssets';

import RoomEditToolbar from '@/components/game/RoomEditToolbar';

import QuestPanel from '@/components/game/QuestPanel';

import HallOfFame from '@/components/game/HallOfFame';

import StatusAlert from '@/components/game/StatusAlert';

import DailyBonus from '@/components/game/DailyBonus';

import PWAPrompt from '@/components/game/PWAPrompt';

import SocialMenu from '@/components/game/SocialMenu';

import GuideBook from '@/components/game/GuideBook';

import GuideSheet, { guideArticleToContent } from '@/components/game/GuideSheet';

import type { ChatLinkAction } from '@/components/game/ChatBubble';

import { CONTEXT_GUIDE_IDS, getGuideArticle, type GuideCategory } from '@/lib/guideData';

import NicknameModal from '@/components/game/NicknameModal';

import { usePushNotification } from '@/hooks/usePushNotification';



export type ActiveMenu = 'none' | 'feed' | 'play' | 'decor' | 'collection' | 'profile' | 'quest' | 'hall' | 'social' | 'nickname';



interface HomeProps {

  onResetPet?: () => void;

}



export default function Home({ onResetPet }: HomeProps) {

  const {

    state,

    pendingEvolution,

    isSleeping,

    attendanceResult,

    clearAttendanceResult,

    intimacyMilestoneToast,

    clearIntimacyMilestoneToast,

    syncing,

    setFirebaseSocialActive,

    setFirebaseShopActive,

    moveRoomDecor,

    setRoomDecorScale,

    flipRoomDecor,

    rotateRoomDecorAction,

    adjustRoomDecorZIndex,

    resetRoomDecorPlacement,

    hideRoomDecor,

    showRoomDecor,

    setTutorialSeen,

    clean,

    sleep,

  } = useGame();

  const { playBGM, resumeAudio } = useSound();

  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('none');

  const [roomEditMode, setRoomEditMode] = useState(false);

  const [selectedDecorId, setSelectedDecorId] = useState<string | null>(null);

  const [previewWallpaperId, setPreviewWallpaperId] = useState<string>('default');

  const [wallpaperReady, setWallpaperReady] = useState(false);

  const [guideBookOpen, setGuideBookOpen] = useState(false);

  const [guideInitialCategory, setGuideInitialCategory] = useState<GuideCategory>('care');

  const [guideInitialArticleId, setGuideInitialArticleId] = useState<string | undefined>();

  const [contextGuideId, setContextGuideId] = useState<string | null>(null);

  const { checkAndNotify, scheduleBackgroundCheck } = usePushNotification();



  const furniture = state.room?.furniture ?? [];

  const hasFurniture = furniture.length > 0;



  // 소셜/상점 RTDB 리스너 lazy 구독

  useEffect(() => {

    setFirebaseSocialActive(activeMenu === 'social');

    setFirebaseShopActive(activeMenu === 'decor');

  }, [activeMenu, setFirebaseSocialActive, setFirebaseShopActive]);



  useEffect(() => {

    return () => {

      setFirebaseSocialActive(false);

      setFirebaseShopActive(false);

    };

  }, [setFirebaseSocialActive, setFirebaseShopActive]);



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

    if (!isMinigameBgmActive()) {
      playBGM('main-room');
    }

  }, []); // eslint-disable-line react-hooks/exhaustive-deps



  useEffect(() => {

    if (!intimacyMilestoneToast) return;

    const timer = setTimeout(clearIntimacyMilestoneToast, 4500);

    return () => clearTimeout(timer);

  }, [intimacyMilestoneToast, clearIntimacyMilestoneToast]);



  useEffect(() => {

    if (state.tutorialSeen?.[CONTEXT_GUIDE_IDS.careBasics]) return;

    const timer = setTimeout(() => {

      setContextGuideId(prev => prev ?? CONTEXT_GUIDE_IDS.careBasics);

    }, 1000);

    return () => clearTimeout(timer);

  }, []); // eslint-disable-line react-hooks/exhaustive-deps



  const openGuideBook = (category: GuideCategory = 'care', articleId?: string) => {

    setGuideInitialCategory(category);

    setGuideInitialArticleId(articleId);

    setGuideBookOpen(true);

  };



  const dismissContextGuide = (dismissForever: boolean) => {

    if (contextGuideId && dismissForever) {

      setTutorialSeen(contextGuideId, true);

    }

    setContextGuideId(null);

  };



  const enterRoomEdit = () => {

    setRoomEditMode(true);

    setPreviewWallpaperId(state.room?.wallpaper ?? 'default');

    setSelectedDecorId(furniture[0] ?? null);

    if (!state.tutorialSeen?.[CONTEXT_GUIDE_IDS.roomEdit]) {

      setContextGuideId(CONTEXT_GUIDE_IDS.roomEdit);

    }

  };



  const handleChatAction = (action: ChatLinkAction) => {

    switch (action) {

      case 'feed':

        setActiveMenu('feed');

        break;

      case 'play':

      case 'play_ball':

      case 'play_puzzle':

      case 'play_ribbon':

        setActiveMenu('play');

        break;

      case 'clean':

        clean();

        break;

      case 'sleep':

        sleep();

        break;

      case 'decor':

        setActiveMenu('decor');

        break;

    }

  };



  const exitRoomEdit = () => {

    setRoomEditMode(false);

    setSelectedDecorId(null);

    setPreviewWallpaperId(state.room?.wallpaper ?? 'default');

  };



  return (

    <div

      className="relative w-full h-full overflow-hidden flex flex-col"

      onClick={() => {

        resumeAudio();

        if (!isMinigameBgmActive()) {

          playBGM('main-room');

        }

      }}

    >

      <div className="relative z-10 flex flex-col h-full min-h-0">

        <TopBar

          coins={state.coins}

          gems={state.gems}

          onCollectionClick={() => !roomEditMode && setActiveMenu('collection')}

          onQuestClick={() => !roomEditMode && setActiveMenu('quest')}

          onHallClick={

            !roomEditMode && ((state.pet.stage === 'adult' && state.pet.species === '레전드몬') || state.pet.stage === 'mythic')

              ? () => setActiveMenu('hall')

              : undefined

          }

          onSocialClick={() => !roomEditMode && setActiveMenu('social')}

          onNicknameClick={() => !roomEditMode && setActiveMenu('nickname')}

          nickname={state.nickname}

          syncing={syncing}

          unclaimedMissions={

            (state.missions?.missions ?? []).filter(m => m.completed && !m.claimed).length

          }

        />

        {/* Room Stage + 편집 패널 (A: Safe Edit Zone — 겹치지 않음) */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 relative min-h-0">
            <RoomStage
              wallpaperId={roomEditMode ? previewWallpaperId : (state.room?.wallpaper ?? 'default')}
              furniture={furniture}
              placements={state.room?.placements}
              hiddenDecor={state.room?.hiddenDecor}
              editMode={roomEditMode}
              selectedDecorId={selectedDecorId}
              onSelectDecor={setSelectedDecorId}
              onMoveDecor={moveRoomDecor}
              onWallpaperReadyChange={setWallpaperReady}
            >
              <RoomHeaderOverlay
                pet={state.pet}
                status={state.status}
                wallpaperUrl={getWallpaperUrl(roomEditMode ? previewWallpaperId : (state.room?.wallpaper ?? 'default'))}
                wallpaperReady={wallpaperReady}
                roomEditMode={roomEditMode}
                onProfileClick={() => setActiveMenu('profile')}
              />
              <div className={`absolute inset-0 flex items-center justify-center z-10 ${roomEditMode ? 'pointer-events-none opacity-60' : ''}`}>
                <PetDisplay
                  pet={state.pet}
                  isSleeping={isSleeping}
                  onLongPress={roomEditMode ? undefined : () => setActiveMenu('profile')}
                  onChatAction={roomEditMode ? undefined : handleChatAction}
                />
              </div>
            </RoomStage>

            {!roomEditMode && hasFurniture && activeMenu === 'none' && (
              <button
                type="button"
                onClick={enterRoomEdit}
                className="absolute top-2 right-2 z-20 px-3 py-1.5 rounded-full text-xs font-bold text-purple-700 transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                  border: '1.5px solid rgba(167,139,250,0.5)',
                }}
              >
                ✏️ 방 꾸미기
              </button>
            )}
          </div>

          {roomEditMode && (
            <RoomEditToolbar
              wallpaperId={state.room?.wallpaper ?? 'default'}
              previewWallpaperId={previewWallpaperId}
              ownedWallpapers={state.ownedWallpapers ?? []}
              furniture={furniture}
              placements={state.room?.placements}
              hiddenDecor={state.room?.hiddenDecor}
              selectedId={selectedDecorId}
              onSelect={setSelectedDecorId}
              onPreviewWallpaper={setPreviewWallpaperId}
              onScaleChange={setRoomDecorScale}
              onFlip={flipRoomDecor}
              onRotate={rotateRoomDecorAction}
              onZIndexChange={adjustRoomDecorZIndex}
              onReset={resetRoomDecorPlacement}
              onHide={hideRoomDecor}
              onShow={showRoomDecor}
              onDone={exitRoomEdit}
              onOpenGuide={() => openGuideBook('room', 'guide_room_edit')}
            />
          )}
        </div>



        {!roomEditMode && (

          <ActionDock activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

        )}

      </div>



      {activeMenu === 'feed' && (

        <FeedingMenu onClose={() => setActiveMenu('none')} />

      )}

      {activeMenu === 'play' && (

        <PlayMenu onClose={() => setActiveMenu('none')} />

      )}

      {activeMenu === 'decor' && (

        <ShopMenu

          onClose={() => setActiveMenu('none')}

          onStartRoomEdit={() => {

            setActiveMenu('none');

            enterRoomEdit();

          }}

          onOpenGuide={() => openGuideBook('room')}

          onOpenGuideArticle={(articleId) => openGuideBook('room', articleId)}

          onRequestContextGuide={(articleId) => setContextGuideId(articleId)}

        />

      )}

      {activeMenu === 'collection' && (

        <CollectionMenu onClose={() => setActiveMenu('none')} />

      )}

      {activeMenu === 'profile' && (

        <PetProfile

          onClose={() => setActiveMenu('none')}

          onOpenGuide={() => {

            setActiveMenu('none');

            openGuideBook('care');

          }}

          onResetPet={onResetPet ? () => { setActiveMenu('none'); onResetPet(); } : undefined}

        />

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



      <StatusAlert />



      {isSleeping && <SleepOverlay />}



      {pendingEvolution && <EvolutionScreen />}



      {attendanceResult?.isNewDay && (

        <DailyBonus result={attendanceResult} onClose={clearAttendanceResult} />

      )}



      {intimacyMilestoneToast && (

        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] max-w-xs w-[90%]">

          <div className="bg-white/95 backdrop-blur-md border-2 border-pink-200 rounded-2xl px-4 py-3 shadow-xl text-center animate-slide-up">

            <p className="text-sm font-bold text-pink-600">💕 {intimacyMilestoneToast.label} 달성!</p>

            <p className="text-xs text-sub-brown mt-1">{intimacyMilestoneToast.message}</p>

          </div>

        </div>

      )}



      {guideBookOpen && (

        <GuideBook

          onClose={() => {

            setGuideBookOpen(false);

            setGuideInitialArticleId(undefined);

          }}

          initialCategory={guideInitialCategory}

          initialArticleId={guideInitialArticleId}

        />

      )}



      {contextGuideId && getGuideArticle(contextGuideId) && (

        <GuideSheet

          content={guideArticleToContent(getGuideArticle(contextGuideId)!)}

          onClose={() => dismissContextGuide(false)}

          showDismissOption

          onConfirm={dismissContextGuide}

          confirmLabel="알겠어요!"

        />

      )}



      <PWAPrompt />

    </div>

  );

}


