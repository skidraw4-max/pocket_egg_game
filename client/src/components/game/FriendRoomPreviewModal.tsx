import { useEffect, useState } from 'react';

import { useGame } from '@/contexts/GameContext';

import type { FriendRoomPreview } from '@/hooks/useFirebaseSync';

import RoomStage from '@/components/game/RoomStage';

import { useCharacterImage } from '@/hooks/useCharacterSkin';

import type { PetStage } from '@/lib/speciesRegistry';



const STAGE_LABEL: Record<string, string> = {

  egg: '알', baby: '아기', child: '어린이', teen: '청소년', adult: '성체', mythic: '전설',

};



interface FriendRoomPreviewModalProps {

  targetUid: string;

  displayName: string;

  onClose: () => void;

}



export default function FriendRoomPreviewModal({

  targetUid,

  displayName,

  onClose,

}: FriendRoomPreviewModalProps) {

  const { fetchFriendPreview, likeFriendRoom, visitFriend, state, gameId } = useGame();

  const [preview, setPreview] = useState<FriendRoomPreview | null>(null);

  const [loading, setLoading] = useState(true);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<'gift' | 'like' | null>(null);

  const petImageUrl = useCharacterImage(

    preview?.pet.species ?? '기본몬',

    (preview?.pet.stage ?? 'baby') as PetStage,

  );



  useEffect(() => {

    let cancelled = false;

    setLoading(true);

    fetchFriendPreview(targetUid).then((data) => {

      if (!cancelled) {

        setPreview(data);

        setLoading(false);

      }

    });

    return () => { cancelled = true; };

  }, [targetUid, fetchFriendPreview]);



  const myNickname = state.nickname?.trim() || (gameId ? `#${gameId}` : '알 주인');



  const handleGift = async () => {

    setActionLoading('gift');

    setStatusMsg(null);

    const result = await visitFriend(targetUid, myNickname);

    setStatusMsg(result.message);

    setActionLoading(null);

  };



  const handleLike = async () => {

    setActionLoading('like');

    setStatusMsg(null);

    const result = await likeFriendRoom(targetUid);

    setStatusMsg(result.message);

    setActionLoading(null);

  };



  return (

    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm overlay-screen">

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[min(90dvh,100%)]">

        <div className="bg-gradient-to-r from-pink-400 to-purple-500 px-5 py-3 flex items-center justify-between">

          <div>

            <h3 className="text-white font-bold">{displayName}의 방</h3>

            <p className="text-white/70 text-xs">친구 방 구경</p>

          </div>

          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">×</button>

        </div>



        <div className="flex-1 overflow-y-auto">

          {loading ? (

            <div className="py-16 text-center text-gray-400 text-sm">방 정보를 불러오는 중...</div>

          ) : !preview ? (

            <div className="py-16 text-center text-gray-400 text-sm">방 정보를 불러오지 못했어요.</div>

          ) : (

            <>

              <div className="relative w-full aspect-[9/16] max-h-[50vh] mx-auto overflow-hidden">

                <RoomStage

                  wallpaperId={preview.room.wallpaper}

                  furniture={preview.room.furniture}

                  placements={preview.room.placements}

                >

                  <div className="absolute inset-0 flex items-end justify-center pb-4 z-10 pointer-events-none">

                    <img

                      src={petImageUrl}

                      alt={preview.pet.name}

                      className="w-28 h-28 object-contain drop-shadow-xl"

                    />

                  </div>

                </RoomStage>

              </div>



              <div className="p-4 space-y-2">

                <p className="text-sm font-bold text-gray-800">

                  {preview.pet.name} · {preview.pet.species}

                </p>

                <p className="text-xs text-gray-500">

                  Lv.{preview.pet.level} · {STAGE_LABEL[preview.pet.stage] ?? preview.pet.stage}

                </p>

                <p className="text-xs text-gray-400">

                  가구 {preview.room.furniture.length}개 · 배경 {preview.room.wallpaper === 'default' ? '기본' : '특별'}

                </p>

              </div>

            </>

          )}

        </div>



        <div className="p-4 border-t border-gray-100 space-y-2">

          {statusMsg && (

            <p className={`text-xs text-center ${statusMsg.includes('오류') || statusMsg.includes('못') ? 'text-red-500' : 'text-green-600'}`}>

              {statusMsg}

            </p>

          )}

          <div className="flex gap-2">

            <button

              onClick={handleGift}

              disabled={actionLoading !== null}

              className="flex-1 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-sm font-bold rounded-2xl py-2.5 transition-colors"

            >

              {actionLoading === 'gift' ? '...' : '🎁 선물하기'}

            </button>

            <button

              onClick={handleLike}

              disabled={actionLoading !== null}

              className="flex-1 bg-purple-100 hover:bg-purple-200 disabled:opacity-50 text-purple-700 text-sm font-bold rounded-2xl py-2.5 transition-colors"

            >

              {actionLoading === 'like' ? '...' : '💕 좋아요'}

            </button>

          </div>

        </div>

      </div>

    </div>

  );

}


