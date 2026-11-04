/**
 * GuideSheet — 기능 가이드 / 튜토리얼 공용 하단 시트
 */
import { useState } from 'react';
import BottomSheetPanel from '@/components/ui/BottomSheetPanel';
import type { GuideArticle } from '@/lib/guideData';
import type { TutorialData } from '@/components/game/GameTutorialCard';
import { TUTORIALS } from '@/lib/tutorialData';

export interface GuideSheetContent {
  icon: string;
  title: string;
  subtitle: string;
  steps: { icon: string; title: string; description: string }[];
  tip?: string;
  rewards?: TutorialData['rewards'];
}

interface GuideSheetProps {
  content: GuideSheetContent;
  onClose: () => void;
  showDismissOption?: boolean;
  onConfirm?: (dismissForever: boolean) => void;
  confirmLabel?: string;
  headerGradient?: string;
}

function articleToContent(article: GuideArticle): GuideSheetContent {
  if (article.linkedTutorialId && TUTORIALS[article.linkedTutorialId]) {
    const t = TUTORIALS[article.linkedTutorialId];
    return {
      icon: t.gameIcon,
      title: t.gameTitle,
      subtitle: t.subtitle,
      steps: t.steps,
      tip: t.tip,
      rewards: t.rewards,
    };
  }
  return {
    icon: article.icon,
    title: article.title,
    subtitle: article.subtitle,
    steps: article.steps,
    tip: article.tip,
  };
}

export function guideArticleToContent(article: GuideArticle): GuideSheetContent {
  return articleToContent(article);
}

export default function GuideSheet({
  content,
  onClose,
  showDismissOption = false,
  onConfirm,
  confirmLabel = '확인',
  headerGradient = 'from-purple-400 to-pink-400',
}: GuideSheetProps) {
  const [dismissForever, setDismissForever] = useState(false);

  const handleConfirm = () => {
    onConfirm?.(dismissForever);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-end" onClick={onClose}>
      <BottomSheetPanel
        className="bg-white/97 backdrop-blur-lg rounded-t-3xl shadow-2xl"
        maxHeight="90"
        onClick={e => e.stopPropagation()}
        header={
          <div className={`bg-gradient-to-r ${headerGradient} px-5 pt-5 pb-4`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{content.icon}</span>
                <div>
                  <h2 className="text-lg font-bold text-white">{content.title}</h2>
                  <p className="text-xs text-white/80">{content.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        }
        bodyClassName="px-5 py-4"
        footer={
          <>
            {showDismissOption && (
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dismissForever}
                  onChange={e => setDismissForever(e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-400"
                />
                <span className="text-xs text-sub-brown">다음부터 이 안내를 보지 않기</span>
              </label>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-4 bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-base rounded-2xl shadow-md active:scale-95 transition-transform"
            >
              {confirmLabel}
            </button>
          </>
        }
      >
        {content.steps.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-warm-brown mb-3 flex items-center gap-1">
              <span>📖</span> 안내
            </h3>
            <div className="space-y-2">
              {content.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-cream rounded-2xl p-3">
                  <div className="w-7 h-7 rounded-full bg-purple-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-lg">{step.icon}</span>
                      <span className="text-sm font-semibold text-warm-brown">{step.title}</span>
                    </div>
                    <p className="text-xs text-sub-brown leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.rewards && content.rewards.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-warm-brown mb-3 flex items-center gap-1">
              <span>🎁</span> 보상 안내
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {content.rewards.map((r, idx) => (
                <div key={idx} className={`rounded-2xl p-3 border-2 ${r.color}`}>
                  <div className="text-sm font-bold mb-0.5">{r.grade}</div>
                  <div className="text-xs text-sub-brown mb-1">{r.condition}</div>
                  <div className="text-xs font-semibold text-warm-brown">{r.reward}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.tip && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-4">
            <p className="text-xs text-blue-700 flex items-start gap-1.5">
              <span className="text-base flex-shrink-0">💡</span>
              <span>{content.tip}</span>
            </p>
          </div>
        )}
      </BottomSheetPanel>
    </div>
  );
}
