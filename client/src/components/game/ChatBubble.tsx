/**
 * ChatBubble.tsx
 * 반려몬 키워드 대화 컴포넌트
 * 말풍선 탭 → 텍스트 입력창 표시 → 키워드 매칭 응답 말풍선
 */
import { useState, useRef, useEffect } from 'react';
import { getChatResponse } from '@/lib/chatKeywords';

interface ChatBubbleProps {
  petName: string;
  defaultText?: string;       // 기본 말풍선 텍스트 (감정 말풍선)
  onClose?: () => void;       // 닫기 콜백
  onMoodEffect?: (delta: number) => void; // 기분 수치 변화 콜백
}

export default function ChatBubble({ petName, defaultText, onClose, onMoodEffect }: ChatBubbleProps) {
  const [mode, setMode] = useState<'bubble' | 'input' | 'response'>('bubble');
  const [inputText, setInputText] = useState('');
  const [responseText, setResponseText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 입력 모드 전환 시 포커스
  useEffect(() => {
    if (mode === 'input') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mode]);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    };
  }, []);

  const handleBubbleClick = () => {
    setMode('input');
  };

  const handleSubmit = () => {
    const trimmed = inputText.trim();
    const resp = getChatResponse(trimmed, petName);
    setResponseText(resp.text);
    setInputText('');
    setMode('response');

    // 기분 수치 효과 적용
    if (resp.moodEffect && onMoodEffect) {
      onMoodEffect(resp.moodEffect);
    }

    // 5초 후 기본 말풍선으로 복귀
    responseTimerRef.current = setTimeout(() => {
      setMode('bubble');
      setResponseText('');
    }, 5000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setMode('bubble');
      setInputText('');
    }
  };

  const handleClose = () => {
    setMode('bubble');
    setInputText('');
    setResponseText('');
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    onClose?.();
  };

  // 기본 말풍선 (감정 텍스트 또는 대화 유도 텍스트)
  const bubbleText = defaultText || '말 걸어줘요! 💬';

  return (
    <div className="relative flex flex-col items-center" style={{ zIndex: 20 }}>

      {/* === 기본 말풍선 모드 === */}
      {mode === 'bubble' && (
        <button
          onClick={handleBubbleClick}
          className="relative px-5 py-3 shadow-lg transition-transform active:scale-95"
          style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: '50% / 40%',
            border: '2px solid rgba(167,139,250,0.4)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
          title="탭하여 대화하기"
        >
          <span className="text-sm font-bold" style={{ color: '#7C3AED', fontFamily: 'Nunito, sans-serif' }}>
            {bubbleText}
          </span>
          {/* 말풍선 꼬리 */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
            style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '2px 2px 4px rgba(0,0,0,0.06)' }} />
          {/* 대화 힌트 아이콘 */}
          <span className="absolute -top-1 -right-1 text-xs bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
            style={{ fontSize: '9px' }}>💬</span>
        </button>
      )}

      {/* === 텍스트 입력 모드 === */}
      {mode === 'input' && (
        <div
          className="relative shadow-xl"
          style={{
            background: 'rgba(255,255,255,0.98)',
            borderRadius: '20px',
            border: '2px solid rgba(167,139,250,0.6)',
            boxShadow: '0 8px 32px rgba(124,58,237,0.15)',
            padding: '10px 12px',
            minWidth: '220px',
            maxWidth: '280px',
          }}
        >
          {/* 입력창 헤더 */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: '#7C3AED' }}>
              💬 {petName}에게 말하기
            </span>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-xs ml-2"
              style={{ lineHeight: 1 }}
            >✕</button>
          </div>

          {/* 텍스트 입력 */}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="말을 걸어봐요..."
              maxLength={30}
              className="flex-1 text-sm outline-none bg-transparent"
              style={{
                color: '#374151',
                fontFamily: 'Nunito, sans-serif',
                border: 'none',
                borderBottom: '1.5px solid rgba(167,139,250,0.4)',
                paddingBottom: '2px',
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!inputText.trim()}
              className="text-white text-xs font-bold px-3 py-1.5 rounded-full transition-opacity disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                minWidth: '40px',
              }}
            >
              전송
            </button>
          </div>

          {/* 키워드 힌트 */}
          <div className="mt-2 flex flex-wrap gap-1">
            {['이름이 뭐야?', '좋아해', '배고파?', '같이 놀자'].map(hint => (
              <button
                key={hint}
                onClick={() => { setInputText(hint); inputRef.current?.focus(); }}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(167,139,250,0.15)',
                  color: '#7C3AED',
                  border: '1px solid rgba(167,139,250,0.3)',
                }}
              >
                {hint}
              </button>
            ))}
          </div>

          {/* 말풍선 꼬리 */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
            style={{ background: 'rgba(255,255,255,0.98)', boxShadow: '2px 2px 4px rgba(0,0,0,0.06)' }} />
        </div>
      )}

      {/* === 응답 말풍선 모드 === */}
      {mode === 'response' && (
        <button
          onClick={handleBubbleClick}
          className="relative px-5 py-3 shadow-lg transition-transform active:scale-95 animate-response-pop"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(237,233,254,0.98))',
            borderRadius: '50% / 40%',
            border: '2px solid rgba(167,139,250,0.5)',
            boxShadow: '0 6px 24px rgba(124,58,237,0.2)',
            whiteSpace: 'nowrap',
            maxWidth: '240px',
            cursor: 'pointer',
          }}
        >
          <span className="text-sm font-bold" style={{
            color: '#5B21B6',
            fontFamily: 'Nunito, sans-serif',
            whiteSpace: 'normal',
            display: 'block',
            textAlign: 'center',
            lineHeight: '1.4',
          }}>
            {responseText}
          </span>
          {/* 말풍선 꼬리 */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
            style={{
              background: 'rgba(237,233,254,0.98)',
              boxShadow: '2px 2px 4px rgba(0,0,0,0.06)',
            }} />
        </button>
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
