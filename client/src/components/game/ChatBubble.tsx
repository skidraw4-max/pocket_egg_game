/**
 * ChatBubble.tsx — 선택형 대화 (입력 제거, 1~4단계)
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  type ChatChoice,
  type ChatChoiceContext,
  type ChatLinkAction,
  type ResolvedChat,
  CHAT_DAILY_LIMIT,
  canUseChatDialogue,
  getChatCapResponse,
  getChoicesForContext,
  getChatRemainingToday,
  resolveBranchChoice,
  resolveChoice,
  getChoiceById,
} from '@/lib/chatChoices';
import type { GameState } from '@/lib/gameState';

type BubbleMode = 'bubble' | 'choices' | 'branch' | 'response';

interface ChatBubbleProps {
  petName: string;
  defaultText?: string;
  flashText?: string | null;
  gameState: GameState;
  chatContext: ChatChoiceContext;
  onApplyDialogue: (moodDelta?: number) => boolean;
  onChatAction?: (action: ChatLinkAction) => void;
  onClose?: () => void;
}

const ACTION_LABELS: Record<ChatLinkAction, string> = {
  feed: '🍖 먹이 주러 가기',
  play: '🎾 놀이 목록 열기',
  play_ball: '⚽ 공놀이 하러 가기',
  play_puzzle: '⭐ 퍼즐 하러 가기',
  play_ribbon: '🎀 리듬 게임 열기',
  clean: '🛁 목욕시키기',
  sleep: '🌙 재우러 가기',
  decor: '🏠 방 꾸미러 가기',
};

export default function ChatBubble({
  petName,
  defaultText,
  flashText,
  gameState,
  chatContext,
  onApplyDialogue,
  onChatAction,
  onClose,
}: ChatBubbleProps) {
  const [mode, setMode] = useState<BubbleMode>('bubble');
  const [responseText, setResponseText] = useState('');
  const [pendingAction, setPendingAction] = useState<ChatLinkAction | undefined>();
  const [branchParentId, setBranchParentId] = useState<string | null>(null);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const choices = useMemo(() => getChoicesForContext(chatContext), [chatContext]);
  const branchParent = branchParentId ? getChoiceById(branchParentId) : null;
  const remaining = getChatRemainingToday(gameState);

  useEffect(() => {
    return () => {
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    };
  }, []);

  const showResponse = (resolved: ResolvedChat) => {
    setResponseText(resolved.text);
    setPendingAction(resolved.action);
    setMode('response');
    setBranchParentId(null);
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    responseTimerRef.current = setTimeout(() => {
      setMode('bubble');
      setResponseText('');
      setPendingAction(undefined);
    }, 6000);
  };

  const handleBubbleClick = () => {
    if (flashText) return;
    if (!canUseChatDialogue(gameState)) {
      showResponse(getChatCapResponse(petName));
      return;
    }
    setMode('choices');
  };

  const handleClose = () => {
    setMode('bubble');
    setResponseText('');
    setPendingAction(undefined);
    setBranchParentId(null);
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    onClose?.();
  };

  const commitDialogue = (resolved: ResolvedChat) => {
    const ok = onApplyDialogue(resolved.moodEffect);
    if (!ok) {
      showResponse(getChatCapResponse(petName));
      return;
    }
    showResponse(resolved);
  };

  const handleChoicePick = (choice: ChatChoice) => {
    if (choice.branches && choice.branches.length > 0) {
      setBranchParentId(choice.id);
      setMode('branch');
      return;
    }
    commitDialogue(resolveChoice(choice.id, petName));
  };

  const handleBranchPick = (branchId: string) => {
    if (!branchParentId) return;
    commitDialogue(resolveBranchChoice(branchParentId, branchId, petName));
  };

  const handleActionClick = () => {
    if (pendingAction && onChatAction) {
      onChatAction(pendingAction);
    }
    handleClose();
  };

  const bubbleText = flashText || defaultText || '말 걸어줘요! 💬';
  const isFlash = Boolean(flashText);

  return (
    <div className="relative flex flex-col items-center" style={{ zIndex: 20 }}>

      {mode === 'bubble' && (
        <button
          type="button"
          onClick={handleBubbleClick}
          className={`relative px-5 py-3 shadow-lg transition-transform active:scale-95 ${isFlash ? 'animate-response-pop' : ''}`}
          style={{
            background: isFlash
              ? 'linear-gradient(135deg, rgba(255,240,245,0.98), rgba(255,255,255,0.98))'
              : 'rgba(255,255,255,0.97)',
            borderRadius: '50% / 40%',
            border: isFlash ? '2px solid rgba(236,72,153,0.45)' : '2px solid rgba(167,139,250,0.4)',
            boxShadow: isFlash ? '0 6px 24px rgba(236,72,153,0.18)' : '0 4px 20px rgba(0,0,0,0.12)',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
          title="탭하여 대화하기"
        >
          <span className="text-sm font-bold" style={{
            color: isFlash ? '#DB2777' : '#7C3AED',
            fontFamily: 'Nunito, sans-serif',
          }}>
            {bubbleText}
          </span>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
            style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '2px 2px 4px rgba(0,0,0,0.06)' }} />
          {!isFlash && (
            <span className="absolute -top-1 -right-1 text-xs bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
              style={{ fontSize: '9px' }}>💬</span>
          )}
        </button>
      )}

      {(mode === 'choices' || mode === 'branch') && (
        <div
          className="relative shadow-xl animate-response-pop"
          style={{
            background: 'rgba(255,255,255,0.98)',
            borderRadius: '20px',
            border: '2px solid rgba(167,139,250,0.6)',
            boxShadow: '0 8px 32px rgba(124,58,237,0.15)',
            padding: '10px 12px',
            minWidth: '240px',
            maxWidth: '280px',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: '#7C3AED' }}>
              {mode === 'branch' ? `💬 ${branchParent?.label ?? '선택'}` : `💬 ${petName}에게 말하기`}
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-xs ml-2"
            >✕</button>
          </div>

          {mode === 'branch' && branchParent?.branches && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              {branchParent.branches.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleBranchPick(b.id)}
                  className="min-h-[44px] py-2 px-2 rounded-xl text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 active:scale-95 transition-transform"
                >
                  <span className="block text-base mb-0.5">{b.icon}</span>
                  {b.label}
                </button>
              ))}
            </div>
          )}

          {mode === 'choices' && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              {choices.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleChoicePick(c)}
                  className="min-h-[44px] py-2 px-2 rounded-xl text-[11px] font-bold text-warm-brown bg-cream border border-purple-100 active:scale-95 transition-transform"
                >
                  <span className="block text-base mb-0.5">{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <p className="text-[9px] text-center text-sub-brown">
            오늘 대화 {remaining}/{CHAT_DAILY_LIMIT}
          </p>

          {mode === 'branch' && (
            <button
              type="button"
              onClick={() => setMode('choices')}
              className="w-full mt-2 text-[10px] text-purple-600 font-bold py-1"
            >
              ← 주제 다시 고르기
            </button>
          )}

          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
            style={{ background: 'rgba(255,255,255,0.98)', boxShadow: '2px 2px 4px rgba(0,0,0,0.06)' }} />
        </div>
      )}

      {mode === 'response' && (
        <div className="flex flex-col items-center gap-2 max-w-[260px]">
          <div
            className="relative px-5 py-3 shadow-lg animate-response-pop"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(237,233,254,0.98))',
              borderRadius: '50% / 40%',
              border: '2px solid rgba(167,139,250,0.5)',
              boxShadow: '0 6px 24px rgba(124,58,237,0.2)',
            }}
          >
            <span className="text-sm font-bold block text-center leading-relaxed" style={{
              color: '#5B21B6',
              fontFamily: 'Nunito, sans-serif',
            }}>
              {responseText}
            </span>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
              style={{
                background: 'rgba(237,233,254,0.98)',
                boxShadow: '2px 2px 4px rgba(0,0,0,0.06)',
              }} />
          </div>

          {pendingAction && onChatAction && (
            <button
              type="button"
              onClick={handleActionClick}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-purple-400 to-pink-400 text-white text-xs font-bold active:scale-95 transition-transform"
            >
              {ACTION_LABELS[pendingAction]}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (canUseChatDialogue(gameState)) setMode('choices');
              else handleClose();
            }}
            className="text-[10px] text-purple-600 font-bold py-1"
          >
            {canUseChatDialogue(gameState) ? '다시 대화하기' : '닫기'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes response-pop {
          0% { opacity: 0; transform: scale(0.8) translateY(4px); }
          60% { transform: scale(1.05) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-response-pop {
          animation: response-pop 0.35s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
      `}</style>
    </div>
  );
}

export type { ChatLinkAction, ChatChoiceContext };
