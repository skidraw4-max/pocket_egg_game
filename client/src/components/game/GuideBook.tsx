/**
 * GuideBook — 기능 가이드 허브 (카테고리 탭 + 목록 + 상세)
 */
import { useState } from 'react';
import {
  GUIDE_CATEGORIES,
  getGuidesByCategory,
  getGuideArticle,
  type GuideCategory,
} from '@/lib/guideData';
import GuideSheet, { guideArticleToContent } from '@/components/game/GuideSheet';

interface GuideBookProps {
  onClose: () => void;
  initialCategory?: GuideCategory;
  initialArticleId?: string;
}

export default function GuideBook({ onClose, initialCategory = 'care', initialArticleId }: GuideBookProps) {
  const [category, setCategory] = useState<GuideCategory>(initialCategory);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(initialArticleId ?? null);

  const articles = getGuidesByCategory(category);
  const selectedArticle = selectedArticleId ? getGuideArticle(selectedArticleId) : null;

  if (selectedArticle) {
    return (
      <GuideSheet
        content={guideArticleToContent(selectedArticle)}
        onClose={() => setSelectedArticleId(null)}
        onConfirm={() => setSelectedArticleId(null)}
        confirmLabel="목록으로"
        headerGradient="from-purple-400 to-pink-400"
      />
    );
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-end bg-black/30" onClick={onClose}>
      <div
        className="w-full bg-white/97 backdrop-blur-lg rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden flex flex-col max-h-[min(88dvh,100%)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-purple-400 to-pink-400 px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📖</span> 포켓 에그 가이드
              </h2>
              <p className="text-xs text-white/80 mt-0.5">기능별 설명을 모아두었어요</p>
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

        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto shrink-0 border-b border-border bg-cream/50">
          {GUIDE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                category === cat.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-sub-brown border border-border'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 pb-app-safe space-y-2 min-h-0">
          {articles.map(article => (
            <button
              key={article.id}
              type="button"
              onClick={() => setSelectedArticleId(article.id)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-cream border border-border text-left active:scale-[0.99] transition-transform"
            >
              <span className="text-2xl shrink-0">{article.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-warm-brown truncate">{article.title}</p>
                <p className="text-[10px] text-sub-brown truncate">{article.subtitle}</p>
              </div>
              <span className="text-sub-brown text-xs shrink-0">›</span>
            </button>
          ))}
        </div>

        <style>{`
          @keyframes slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up {
            animation: slide-up 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
          }
        `}</style>
      </div>
    </div>
  );
}
